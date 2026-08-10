import crypto from 'crypto';
import type { Pool } from 'pg';
import type { PrismaClient } from '@/generated/prisma/client';
import { seedStationCapacityTiers } from '@/prisma/data/seed-station-capacity-tiers';
import {
  asBool,
  asDate,
  asDecimalString,
  asInt,
  asString,
  bulkUpsertById,
  parseStationIdsJson,
} from './bulk';
import {
  buildOldSslEnabled,
  OldSource,
  redactDatabaseHost,
} from './old-source';
import { createReport, writeReport } from './report';
import {
  mapOldRoleNameToNew,
  resellerScopeKey,
  stationScopeKey,
  WIFI_ROLE,
} from './role-map';
import {
  bump,
  emptyStats,
  PHASE_LABELS,
  shouldRunPhase,
  type MigrateOptions,
  type MigrateReport,
} from './types';

type Ctx = {
  old: OldSource;
  prisma: PrismaClient;
  newPool: Pool;
  report: MigrateReport;
  apply: boolean;
  batchSize: number;
  orgIds: string[] | null;
  /** Inclusive lower bound for delta sync (null = full table). */
  since: Date | null;
  /** OLD admin id → NEW admin id (after username collision remaps). */
  adminIdMap: Map<string, string>;
  /**
   * OLD station id → NEW station id when org+code already exists under a different id.
   * Identity mapping is omitted (caller uses old id when absent).
   */
  stationIdMap: Map<string, string>;
  defaultStationSizeId: string;
  mediumUnitPrice: string;
};

const ORG_FIELDS = [
  'id',
  'code',
  'name',
  'description',
  'stationCodePrefix',
  'planCodePrefix',
  'resellerCodePrefix',
  'timezone',
  'currency',
  'announcement',
  'enableAnnouncement',
  'isActive',
  'adminId',
  'createdAt',
  'updatedAt',
  'deletedAt',
] as const;

export async function runWifiLegacyMigration(
  prisma: PrismaClient,
  newPool: Pool,
  options: MigrateOptions,
): Promise<{ report: MigrateReport; reportPath: string }> {
  const oldUrl = (process.env.OLD_DATABASE_URL || '').trim();
  if (!oldUrl) {
    throw new Error('OLD_DATABASE_URL is required (volo-api-console PostgreSQL URL)');
  }

  const old = new OldSource(oldUrl, buildOldSslEnabled());
  await old.connect();

  const phase = options.phase;
  const report = createReport({
    startedAt: new Date().toISOString(),
    mode: options.mode,
    phase: phase ?? 'all',
    since: options.since ? options.since.toISOString() : null,
    orgFilter: options.orgCode ?? null,
    oldDatabaseHost: redactDatabaseHost(oldUrl),
    namingStyle: old.namingStyle,
    tablesPresent: old.tablesPresent,
  });

  const apply = options.mode === 'apply';
  report.notes.push(
    apply
      ? 'APPLY mode: writing to NEW database'
      : 'DRY-RUN mode: no writes to NEW database',
  );
  report.notes.push(
    phase
      ? `Running ${PHASE_LABELS[phase]} only — verify before the next phase`
      : 'Running all phases (1→2→3). Prefer --phase=N for gated cutover.',
  );
  report.notes.push(
    'v1 scope: core ops + commerce. Skips RadiusSession, audit, reporting, SaaS invoices, Agent table.',
  );
  report.notes.push(
    'agentId columns are dropped (null). Credential.voucherBatchId skipped when absent in OLD.',
  );
  if (options.since) {
    report.notes.push(
      `--since=${options.since.toISOString()} — delta filter on createdAt/updatedAt (paidAt for payments). Phase 1 membership rebuild stays full.`,
    );
  }

  try {
    const run1 = shouldRunPhase(phase, 1);
    const run2 = shouldRunPhase(phase, 2);
    const run3 = shouldRunPhase(phase, 3);

    if (apply && run1) {
      const tiers = await seedStationCapacityTiers(prisma);
      report.notes.push(
        `Ensured StationSize tiers (${tiers.tiers}) and created ${tiers.prices} missing license prices`,
      );
    }

    const medium = await prisma.stationSize.findFirst({
      where: { code: 'MEDIUM', isActive: true },
      select: { id: true },
    });
    if (!medium && apply && run1) {
      throw new Error('MEDIUM StationSize missing after capacity seed');
    }
    if (!medium && apply && (run2 || run3) && !run1) {
      // Phase 2/3 need stations already migrated with a size tier present in NEW.
      const anySize = await prisma.stationSize.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (!anySize) {
        throw new Error('No StationSize in NEW DB — run phase 1 first');
      }
    }

    const mediumPrice = await prisma.stationLicensePrice.findFirst({
      where: { stationSize: { code: 'MEDIUM' }, billingCycle: 'MONTHLY', isActive: true },
      orderBy: { effectiveFrom: 'desc' },
      select: { unitPrice: true },
    });

    const orgIds = await resolveOrgFilter(old, options.orgCode, report);

    const ctx: Ctx = {
      old,
      prisma,
      newPool,
      report,
      apply,
      batchSize: options.batchSize,
      orgIds,
      since: options.since ?? null,
      adminIdMap: new Map(),
      stationIdMap: new Map(),
      defaultStationSizeId: medium?.id ?? 'DRY_RUN_SIZE',
      mediumUnitPrice: mediumPrice ? String(mediumPrice.unitPrice) : '100000.00',
    };

    // Always build station remaps before inventory/commerce so FKs resolve.
    await ensureStationIdRemaps(ctx);

    if (run1) {
      console.log(`→ ${PHASE_LABELS[1]}`);
      await importAdmins(ctx);
      await importOrgsAndLicenses(ctx);
      await importResellers(ctx);
      await importStationsAndDevices(ctx);
      await importMembership(ctx);
      await importPlansAndPrices(ctx);
      await importResellerEntitlementsAndStations(ctx);
    }

    if (run2) {
      console.log(`→ ${PHASE_LABELS[2]}`);
      await importVoucherBatches(ctx);
      await importCredentials(ctx);
    }

    if (run3) {
      console.log(`→ ${PHASE_LABELS[3]}`);
      await importSales(ctx);
      await importCommissions(ctx);
    }

    const reportPath = writeReport(report, options.reportPath);
    return { report, reportPath };
  } finally {
    await old.end();
  }
}

async function resolveOrgFilter(
  old: OldSource,
  orgCode: string | undefined,
  report: MigrateReport,
): Promise<string[] | null> {
  if (!orgCode) return null;
  const codeCol = old.col('wf_org', 'code');
  if (!codeCol) throw new Error('wf_org.code missing');
  const rows = await old.query<{ id: string; code: string }>(
    `SELECT ${old.q(old.col('wf_org', 'id')!)} AS id, ${old.q(codeCol)} AS code
     FROM ${old.q('wf_org')}
     WHERE ${old.q(codeCol)} = $1`,
    [orgCode],
  );
  if (!rows.length) {
    throw new Error(`Org code not found in OLD database: ${orgCode}`);
  }
  report.notes.push(`Filtered to org ${rows[0].code} (${rows[0].id})`);
  return [rows[0].id];
}

function orgWhere(ctx: Ctx): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (ctx.orgIds?.length) {
    params.push(ctx.orgIds);
    parts.push(`${ctx.old.q(ctx.old.col('wf_org', 'id')!)} = ANY($${params.length}::text[])`);
  }
  if (ctx.since) {
    const clause = appendSincePredicate(ctx, 'wf_org', params);
    if (clause) parts.push(clause);
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

/**
 * Org-scoped WHERE for a child table.
 * When ctx.since is set, also requires createdAt/updatedAt/(paidAt) >= since.
 */
function childOrgWhere(
  ctx: Ctx,
  table: string,
  opts: { since?: boolean } = {},
): { sql: string; params: unknown[] } {
  const useSince = opts.since !== false;
  const parts: string[] = [];
  const params: unknown[] = [];
  if (ctx.orgIds?.length) {
    const orgCol = ctx.old.col(table, 'orgId');
    if (!orgCol) throw new Error(`${table}.orgId missing`);
    params.push(ctx.orgIds);
    parts.push(`${ctx.old.q(orgCol)} = ANY($${params.length}::text[])`);
  }
  if (useSince && ctx.since) {
    const clause = appendSincePredicate(ctx, table, params);
    if (clause) parts.push(clause);
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

/** Mutates params by pushing since; returns SQL predicate or null. */
function appendSincePredicate(ctx: Ctx, table: string, params: unknown[]): string | null {
  if (!ctx.since) return null;
  const candidates = [
    ctx.old.col(table, 'updatedAt'),
    ctx.old.col(table, 'createdAt'),
    ctx.old.col(table, 'paidAt'),
  ].filter((c): c is string => Boolean(c));
  // de-dupe while preserving order
  const cols = [...new Set(candidates)];
  if (!cols.length) return null;
  params.push(ctx.since);
  const p = `$${params.length}`;
  if (cols.length === 1) return `${ctx.old.q(cols[0])} >= ${p}`;
  return `(${cols.map((c) => `${ctx.old.q(c)} >= ${p}`).join(' OR ')})`;
}

function ensureStats(report: MigrateReport, entity: string) {
  if (!report.stats[entity]) report.stats[entity] = emptyStats();
  return report.stats[entity];
}

function issue(
  report: MigrateReport,
  entity: string,
  level: 'warn' | 'error',
  message: string,
  id?: string,
) {
  report.issues.push({ entity, level, message, id });
}

/* -------------------------------------------------------------------------- */
/* Admins                                                                     */
/* -------------------------------------------------------------------------- */

async function importAdmins(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'Admin');
  const adminTable = ctx.old.adminTable;
  if (!ctx.old.hasTable(adminTable)) {
    issue(ctx.report, 'Admin', 'error', `Admin table ${adminTable} not found`);
    return;
  }

  const roleTable = ctx.old.hasTable('cd_mng_roles')
    ? 'cd_mng_roles'
    : ctx.old.hasTable('tbl_mng_roles')
      ? 'tbl_mng_roles'
      : null;

  const whereParts = [
    `a.id IN (
      SELECT "adminId" FROM wf_org WHERE "adminId" IS NOT NULL
      UNION SELECT "adminId" FROM wf_station WHERE "adminId" IS NOT NULL
      UNION SELECT "adminId" FROM wf_reseller WHERE "adminId" IS NOT NULL
    )`,
  ];
  // Prefer camelCase quoted ids as live OLD uses; fall back via information_schema-aware rebuild:
  const orgAdminCol = ctx.old.col('wf_org', 'adminId');
  const stAdminCol = ctx.old.col('wf_station', 'adminId');
  const rsAdminCol = ctx.old.col('wf_reseller', 'adminId');
  const unions: string[] = [];
  if (orgAdminCol) {
    unions.push(
      `SELECT ${ctx.old.q(orgAdminCol)} FROM ${ctx.old.q('wf_org')} WHERE ${ctx.old.q(orgAdminCol)} IS NOT NULL`,
    );
  }
  if (stAdminCol) {
    unions.push(
      `SELECT ${ctx.old.q(stAdminCol)} FROM ${ctx.old.q('wf_station')} WHERE ${ctx.old.q(stAdminCol)} IS NOT NULL`,
    );
  }
  if (rsAdminCol) {
    unions.push(
      `SELECT ${ctx.old.q(rsAdminCol)} FROM ${ctx.old.q('wf_reseller')} WHERE ${ctx.old.q(rsAdminCol)} IS NOT NULL`,
    );
  }
  if (!unions.length) {
    issue(ctx.report, 'Admin', 'warn', 'No adminId columns found on org/station/reseller');
    return;
  }

  let filterSql = `WHERE a.id IN (${unions.join(' UNION ')})`;
  const params: unknown[] = [];
  if (ctx.orgIds?.length) {
    const orgIdCol = ctx.old.col('wf_org', 'id')!;
    const orgAdmin = ctx.old.col('wf_org', 'adminId');
    const stOrg = ctx.old.col('wf_station', 'orgId');
    const stAdmin = ctx.old.col('wf_station', 'adminId');
    const rsOrg = ctx.old.col('wf_reseller', 'orgId');
    const rsAdmin = ctx.old.col('wf_reseller', 'adminId');
    const scoped: string[] = [];
    if (orgAdmin) {
      scoped.push(
        `SELECT ${ctx.old.q(orgAdmin)} FROM ${ctx.old.q('wf_org')} WHERE ${ctx.old.q(orgIdCol)} = ANY($1::text[]) AND ${ctx.old.q(orgAdmin)} IS NOT NULL`,
      );
    }
    if (stOrg && stAdmin) {
      scoped.push(
        `SELECT ${ctx.old.q(stAdmin)} FROM ${ctx.old.q('wf_station')} WHERE ${ctx.old.q(stOrg)} = ANY($1::text[]) AND ${ctx.old.q(stAdmin)} IS NOT NULL`,
      );
    }
    if (rsOrg && rsAdmin) {
      scoped.push(
        `SELECT ${ctx.old.q(rsAdmin)} FROM ${ctx.old.q('wf_reseller')} WHERE ${ctx.old.q(rsOrg)} = ANY($1::text[]) AND ${ctx.old.q(rsAdmin)} IS NOT NULL`,
      );
    }
    filterSql = `WHERE a.id IN (${scoped.join(' UNION ')})`;
    params.push(ctx.orgIds);
    void whereParts;
  }

  const roleJoin = roleTable
    ? `LEFT JOIN ${ctx.old.q(roleTable)} r ON r.role_id = a.role_id`
    : '';
  const roleSelect = roleTable ? ', r.role_name AS role_name' : ', NULL::text AS role_name';

  const rows = await ctx.old.query<{
    id: string;
    full_name: string;
    username: string;
    email: string | null;
    password: string;
    role_id: number;
    phone_number: string | null;
    profile_image: string | null;
    is_active: boolean;
    is_super: boolean;
    is_verified: boolean;
    is_blocked: boolean;
    is_online: boolean;
    last_login: Date | null;
    last_ip: string | null;
    join_date: Date | null;
    reporter_code: string | null;
    employment_type: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
    role_name: string | null;
  }>(
    `SELECT a.id, a.full_name, a.username, a.email, a.password, a.role_id,
            a.phone_number, a.profile_image, a.is_active, a.is_super, a.is_verified,
            a.is_blocked, a.is_online, a.last_login, a.last_ip, a.join_date,
            a.reporter_code, a.employment_type, a.created_by, a.updated_by,
            a.created_at, a.updated_at, a.deleted_at
            ${roleSelect}
     FROM ${ctx.old.q(adminTable)} a
     ${roleJoin}
     ${filterSql}`,
    params,
  );

  stats.source = rows.length;

  // Resolve NEW role ids by name
  const newRoles = await ctx.prisma.mngRoles.findMany({
    where: { deletedAt: null },
    select: { roleId: true, roleName: true },
  });
  const roleIdByName = new Map(newRoles.map((r) => [r.roleName.toUpperCase(), r.roleId]));
  const fallbackRoleId = roleIdByName.get('ORG_VIEWER') ?? roleIdByName.get('ADMIN') ?? newRoles[0]?.roleId;
  if (fallbackRoleId == null && ctx.apply) {
    throw new Error('No MngRoles found in NEW database — seed roles first');
  }

  for (const row of rows) {
    const mappedRoleName = mapOldRoleNameToNew(row.role_name);
    const roleId = roleIdByName.get(mappedRoleName) ?? fallbackRoleId!;

    if (!ctx.apply) {
      ctx.adminIdMap.set(row.id, row.id);
      bump(stats, 'inserted');
      continue;
    }

    try {
      const byId = await ctx.prisma.admin.findUnique({
        where: { id: row.id },
        select: { id: true, username: true },
      });
      const byUsername = await ctx.prisma.admin.findUnique({
        where: { username: row.username },
        select: { id: true, username: true },
      });

      if (byUsername && byUsername.id !== row.id && !byId) {
        // Username owned by another id — remap FKs to existing admin
        ctx.adminIdMap.set(row.id, byUsername.id);
        issue(
          ctx.report,
          'Admin',
          'warn',
          `Username "${row.username}" exists as ${byUsername.id}; remapping OLD ${row.id}`,
          row.id,
        );
        bump(stats, 'skipped');
        continue;
      }

      if (byId) {
        await ctx.prisma.admin.update({
          where: { id: row.id },
          data: {
            fullName: row.full_name,
            email: row.email,
            password: row.password,
            roleId,
            phoneNumber: row.phone_number,
            profileImage: row.profile_image,
            isActive: asBool(row.is_active, true),
            isSuper: asBool(row.is_super),
            isVerified: asBool(row.is_verified),
            isBlocked: asBool(row.is_blocked),
            isOnline: asBool(row.is_online),
            lastLogin: asDate(row.last_login),
            lastIp: row.last_ip,
            joinDate: asDate(row.join_date) ?? undefined,
            reporterCode: row.reporter_code ?? '0001',
            employmentType: row.employment_type ?? 'full_time',
            updatedBy: row.updated_by ?? 'wifi-migrate',
            deletedAt: asDate(row.deleted_at),
            // drop emailAccountId FK from OLD
            emailAccountId: null,
          },
        });
        ctx.adminIdMap.set(row.id, row.id);
        bump(stats, 'updated');
      } else {
        await ctx.prisma.admin.create({
          data: {
            id: row.id,
            fullName: row.full_name,
            username: row.username,
            email: row.email,
            password: row.password,
            roleId,
            phoneNumber: row.phone_number,
            profileImage: row.profile_image,
            isActive: asBool(row.is_active, true),
            isSuper: asBool(row.is_super),
            isVerified: asBool(row.is_verified),
            isBlocked: asBool(row.is_blocked),
            isOnline: asBool(row.is_online),
            lastLogin: asDate(row.last_login),
            lastIp: row.last_ip,
            joinDate: asDate(row.join_date) ?? new Date(),
            reporterCode: row.reporter_code ?? '0001',
            employmentType: row.employment_type ?? 'full_time',
            createdBy: row.created_by ?? 'wifi-migrate',
            updatedBy: row.updated_by,
            createdAt: asDate(row.created_at) ?? new Date(),
            updatedAt: asDate(row.updated_at),
            deletedAt: asDate(row.deleted_at),
            emailAccountId: null,
          },
        });
        ctx.adminIdMap.set(row.id, row.id);
        bump(stats, 'inserted');
      }
    } catch (err) {
      bump(stats, 'errors');
      issue(ctx.report, 'Admin', 'error', (err as Error).message, row.id);
    }
  }
}

function normalizeUserStatus(value: string | null): 'ACTIVE' | 'SUSPENDED' | 'DISABLED' {
  if (value === 'SUSPENDED' || value === 'DISABLED' || value === 'ACTIVE') return value;
  if (value === 'INACTIVE') return 'DISABLED';
  return 'ACTIVE';
}

function normalizeCredentialStatus(value: string | null): string {
  if (value === 'NEW') return 'SOLD';
  if (value === 'ACTIVE' || value === 'IN_USE') return 'ACTIVATED';
  if (
    value === 'SOLD' ||
    value === 'ACTIVATED' ||
    value === 'CONSUMED' ||
    value === 'PAUSED' ||
    value === 'REVOKED' ||
    value === 'EXPIRED'
  ) {
    return value;
  }
  return 'SOLD';
}

function normalizeBillingCycle(_value: string | null): 'MONTHLY' {
  // NEW schema currently only defines MONTHLY
  return 'MONTHLY';
}

function mapAdminId(ctx: Ctx, oldAdminId: string | null | undefined): string | null {
  if (!oldAdminId) return null;
  return ctx.adminIdMap.get(oldAdminId) ?? null;
}

function mapStationId(ctx: Ctx, oldStationId: string | null | undefined): string | null {
  if (!oldStationId) return null;
  return ctx.stationIdMap.get(oldStationId) ?? oldStationId;
}

/**
 * When NEW already has a station with the same org+code but a different id,
 * map OLD station ids → NEW so credentials/sales FKs still resolve.
 */
async function ensureStationIdRemaps(ctx: Ctx): Promise<void> {
  if (!ctx.apply || !ctx.old.hasTable('wf_station')) return;

  const { sql, params } = childOrgWhere(ctx, 'wf_station', { since: false });
  const fields = ['id', 'orgId', 'code'];
  const select = ctx.old.selectList('wf_station', fields);
  const oldRows = await ctx.old.query<{ id: string; orgId: string; code: string }>(
    `SELECT ${select} FROM ${ctx.old.q('wf_station')} ${sql}`,
    params,
  );
  if (!oldRows.length) return;

  const orgIds = [...new Set(oldRows.map((r) => String(r.orgId)))];
  const existing = await ctx.newPool.query<{ id: string; org_id: string; code: string }>(
    `SELECT id, org_id, code
     FROM wf_station
     WHERE org_id = ANY($1::text[])`,
    [orgIds],
  );
  const byOrgCode = new Map(existing.rows.map((r) => [`${r.org_id}::${r.code}`, r.id]));

  let remapped = 0;
  for (const row of oldRows) {
    const key = `${row.orgId}::${row.code}`;
    const newId = byOrgCode.get(key);
    if (newId && newId !== row.id) {
      ctx.stationIdMap.set(String(row.id), newId);
      remapped++;
    }
  }
  if (remapped > 0) {
    ctx.report.notes.push(
      `Station id remaps: ${remapped} OLD station(s) share org+code with a different NEW id`,
    );
  }
}


/* -------------------------------------------------------------------------- */
/* Orgs + licenses                                                            */
/* -------------------------------------------------------------------------- */

async function importOrgsAndLicenses(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'Org');
  const licenseStats = ensureStats(ctx.report, 'OrgLicense');
  const { sql, params } = orgWhere(ctx);

  const select = ctx.old.selectList('wf_org', [...ORG_FIELDS]);
  const rows = await ctx.old.query<Record<string, unknown>>(
    `SELECT ${select} FROM ${ctx.old.q('wf_org')} ${sql}`,
    params,
  );
  stats.source = rows.length;

  for (const row of rows) {
    const id = String(row.id);
    const adminId = mapAdminId(ctx, asString(row.adminId));

    if (!ctx.apply) {
      bump(stats, 'inserted');
      bump(licenseStats, 'inserted');
      continue;
    }

    try {
      const existing = await ctx.prisma.org.findUnique({ where: { id }, select: { id: true } });
      const data = {
        code: String(row.code),
        name: String(row.name),
        description: asString(row.description),
        stationCodePrefix: asString(row.stationCodePrefix) ?? '',
        planCodePrefix: asString(row.planCodePrefix) ?? '',
        resellerCodePrefix: asString(row.resellerCodePrefix) ?? '',
        timezone: asString(row.timezone) ?? 'Asia/Yangon',
        currency: asString(row.currency) ?? 'MMK',
        announcement: asString(row.announcement),
        enableAnnouncement: asBool(row.enableAnnouncement),
        isActive: asBool(row.isActive, true),
        adminId,
        deletedAt: asDate(row.deletedAt),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      };

      // Collision on unique code with different id
      const byCode = await ctx.prisma.org.findFirst({
        where: { code: data.code },
        select: { id: true },
      });
      if (byCode && byCode.id !== id) {
        bump(stats, 'skipped');
        issue(
          ctx.report,
          'Org',
          'error',
          `Org code ${data.code} already exists as ${byCode.id}; refusing to import ${id}`,
          id,
        );
        continue;
      }

      if (existing) {
        await ctx.prisma.org.update({ where: { id }, data });
        bump(stats, 'updated');
      } else {
        await ctx.prisma.org.create({
          data: {
            id,
            ...data,
            createdAt: asDate(row.createdAt) ?? new Date(),
          },
        });
        bump(stats, 'inserted');
      }

      // License from OLD if present, else synthesize
      let stationLimit = 100;
      let currentActive = 0;
      let effectiveFrom = asDate(row.createdAt) ?? new Date();
      let expiresAt: Date | null = null;
      let status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' = 'ACTIVE';
      let billingCycle: 'MONTHLY' = 'MONTHLY';
      let currency = data.currency;
      let notes: string | null = 'Migrated from volo-api-console';
      let unitPrice = ctx.mediumUnitPrice;

      if (ctx.old.hasTable('wf_org_license')) {
        const licSelect = ctx.old.selectList('wf_org_license', [
          'id',
          'orgId',
          'status',
          'billingCycle',
          'stationLimit',
          'currentActiveStationCount',
          'unitPricePerStation',
          'currency',
          'effectiveFrom',
          'expiresAt',
          'notes',
        ]);
        const orgIdCol = ctx.old.col('wf_org_license', 'orgId')!;
        const licRows = await ctx.old.query<Record<string, unknown>>(
          `SELECT ${licSelect} FROM ${ctx.old.q('wf_org_license')} WHERE ${ctx.old.q(orgIdCol)} = $1 LIMIT 1`,
          [id],
        );
        if (licRows[0]) {
          const lic = licRows[0];
          stationLimit = asInt(lic.stationLimit, 100) ?? 100;
          currentActive = asInt(lic.currentActiveStationCount, 0) ?? 0;
          effectiveFrom = asDate(lic.effectiveFrom) ?? effectiveFrom;
          expiresAt = asDate(lic.expiresAt);
          currency = asString(lic.currency) ?? currency;
          notes = asString(lic.notes) ?? notes;
          unitPrice = asDecimalString(lic.unitPricePerStation, unitPrice);
          const st = asString(lic.status);
          if (st === 'ACTIVE' || st === 'SUSPENDED' || st === 'EXPIRED' || st === 'CANCELLED') {
            status = st;
          }
          billingCycle = normalizeBillingCycle(asString(lic.billingCycle));
        }
      }

      // Ensure stationLimit covers actual station count
      const stationCount = await ctx.old.count(
        'wf_station',
        `WHERE ${ctx.old.q(ctx.old.col('wf_station', 'orgId')!)} = $1`,
        [id],
      );
      if (stationLimit < stationCount) stationLimit = stationCount;
      if (currentActive < stationCount) currentActive = stationCount;

      const existingLic = await ctx.prisma.orgLicense.findUnique({ where: { orgId: id } });
      if (existingLic) {
        await ctx.prisma.orgLicense.update({
          where: { orgId: id },
          data: {
            status,
            billingCycle,
            stationLimit,
            currentActiveStationCount: currentActive,
            currency,
            effectiveFrom,
            expiresAt,
            notes,
          },
        });
        bump(licenseStats, 'updated');
      } else {
        await ctx.prisma.orgLicense.create({
          data: {
            orgId: id,
            status,
            billingCycle,
            stationLimit,
            currentActiveStationCount: currentActive,
            currency,
            effectiveFrom,
            expiresAt,
            notes,
          },
        });
        bump(licenseStats, 'inserted');
      }

      // Seed one org size-price override from old flat unit price
      const existingPrice = await ctx.prisma.orgLicenseStationSizePrice.findFirst({
        where: {
          orgId: id,
          stationSizeId: ctx.defaultStationSizeId,
          billingCycle,
          isActive: true,
        },
      });
      if (!existingPrice) {
        await ctx.prisma.orgLicenseStationSizePrice.create({
          data: {
            orgId: id,
            stationSizeId: ctx.defaultStationSizeId,
            billingCycle,
            unitPrice,
            currency,
            pricingSource: 'ORG_CUSTOM',
            effectiveFrom,
            isActive: true,
          },
        });
      }
    } catch (err) {
      bump(stats, 'errors');
      issue(ctx.report, 'Org', 'error', (err as Error).message, id);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Resellers                                                                  */
/* -------------------------------------------------------------------------- */

async function importResellers(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'Reseller');
  if (!ctx.old.hasTable('wf_reseller')) return;
  const fields = [
    'id',
    'orgId',
    'adminId',
    'code',
    'name',
    'phone',
    'email',
    'address',
    'status',
    'stationIds',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];
  const { sql, params } = childOrgWhere(ctx, 'wf_reseller');
  let source = 0;

  for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_reseller', fields, {
    whereSql: sql,
    params,
    batchSize: ctx.batchSize,
  })) {
    source += batch.length;
    if (!ctx.apply) {
      bump(stats, 'inserted', batch.length);
      continue;
    }

    const columns = [
      'id',
      'org_id',
      'admin_id',
      'code',
      'name',
      'phone',
      'email',
      'address',
      'status',
      'station_ids',
      'created_at',
      'updated_at',
      'deleted_at',
    ];
    const rows = batch.map((row) => {
      const stationIds = parseStationIdsJson(row.stationIds).map(
        (id) => mapStationId(ctx, id) ?? id,
      );
      return [
        String(row.id),
        String(row.orgId),
        mapAdminId(ctx, asString(row.adminId)),
        String(row.code),
        String(row.name),
        asString(row.phone),
        asString(row.email),
        asString(row.address),
        normalizeUserStatus(asString(row.status)),
        JSON.stringify(stationIds),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ];
    });

    try {
      const result = await bulkUpsertById(ctx.newPool, 'wf_reseller', columns, rows, [
        'org_id',
        'admin_id',
        'code',
        'name',
        'phone',
        'email',
        'address',
        'status',
        'station_ids',
        'updated_at',
        'deleted_at',
      ]);
      bump(stats, 'inserted', result.inserted);
      bump(stats, 'updated', result.updated);
    } catch (err) {
      // Fall back row-by-row on unique conflicts
      for (const row of batch) {
        try {
          const mappedAdminId = mapAdminId(ctx, asString(row.adminId));
          let adminId = mappedAdminId;
          if (adminId) {
            const taken = await ctx.prisma.reseller.findFirst({
              where: { adminId, NOT: { id: String(row.id) } },
              select: { id: true },
            });
            if (taken) {
              issue(
                ctx.report,
                'Reseller',
                'warn',
                `admin_id ${adminId} already on reseller ${taken.id}; importing ${row.id} with null adminId`,
                String(row.id),
              );
              adminId = null;
            }
          }
          await ctx.prisma.reseller.upsert({
            where: { id: String(row.id) },
            create: {
              id: String(row.id),
              orgId: String(row.orgId),
              adminId,
              code: String(row.code),
              name: String(row.name),
              phone: asString(row.phone),
              email: asString(row.email),
              address: asString(row.address),
              status: normalizeUserStatus(asString(row.status)),
              stationIds: parseStationIdsJson(row.stationIds).map(
                (id) => mapStationId(ctx, id) ?? id,
              ),
              createdAt: asDate(row.createdAt) ?? new Date(),
              updatedAt: asDate(row.updatedAt) ?? new Date(),
              deletedAt: asDate(row.deletedAt),
            },
            update: {
              ...(adminId ? { adminId } : {}),
              name: String(row.name),
              phone: asString(row.phone),
              email: asString(row.email),
              address: asString(row.address),
              status: normalizeUserStatus(asString(row.status)),
              stationIds: parseStationIdsJson(row.stationIds).map(
                (id) => mapStationId(ctx, id) ?? id,
              ),
              updatedAt: asDate(row.updatedAt) ?? new Date(),
              deletedAt: asDate(row.deletedAt),
            },
          });
          bump(stats, 'updated');
        } catch (e) {
          bump(stats, 'errors');
          issue(ctx.report, 'Reseller', 'error', (e as Error).message, String(row.id));
        }
      }
      issue(ctx.report, 'Reseller', 'warn', `Batch upsert failed, fell back: ${(err as Error).message}`);
    }
  }
  stats.source = source;
}

/* -------------------------------------------------------------------------- */
/* Stations + devices                                                         */
/* -------------------------------------------------------------------------- */

async function importStationsAndDevices(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'WifiStation');
  const deviceStats = ensureStats(ctx.report, 'StationDevice');
  if (!ctx.old.hasTable('wf_station')) return;

  const fields = [
    'id',
    'orgId',
    'code',
    'name',
    'location',
    'address',
    'status',
    'portalBaseUrl',
    'nasIdentifier',
    'radiusClientIp',
    'radiusSecret',
    'vlanId',
    'adminId',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];
  const { sql, params } = childOrgWhere(ctx, 'wf_station');
  let source = 0;

  // NEW physical columns (live DB has mixed camelCase for portal fields)
  const stationColumns = [
    'id',
    'org_id',
    'code',
    'name',
    'location',
    'address',
    'status',
    'station_size_id',
    'portalBaseUrl',
    'nasIdentifier',
    'radiusClientIp',
    'radiusSecret',
    'vlan_id',
    'admin_id',
    'radius_vendor_profile_id',
    'created_at',
    'updated_at',
    'deleted_at',
  ];

  for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_station', fields, {
    whereSql: sql,
    params,
    batchSize: ctx.batchSize,
  })) {
    source += batch.length;
    if (!ctx.apply) {
      bump(stats, 'inserted', batch.length);
      continue;
    }

    const rows = batch.map((row) => [
      String(row.id),
      String(row.orgId),
      String(row.code),
      String(row.name),
      asString(row.location),
      asString(row.address),
      asString(row.status) ?? 'ACTIVE',
      ctx.defaultStationSizeId,
      asString(row.portalBaseUrl),
      asString(row.nasIdentifier),
      asString(row.radiusClientIp),
      asString(row.radiusSecret),
      row.vlanId == null ? null : String(row.vlanId),
      mapAdminId(ctx, asString(row.adminId)),
      null, // do not import radius vendor profiles in v1
      asDate(row.createdAt) ?? new Date(),
      asDate(row.updatedAt) ?? new Date(),
      asDate(row.deletedAt),
    ]);

    try {
      const result = await bulkUpsertById(ctx.newPool, 'wf_station', stationColumns, rows, [
        'org_id',
        'code',
        'name',
        'location',
        'address',
        'status',
        'station_size_id',
        'portalBaseUrl',
        'nasIdentifier',
        'radiusClientIp',
        'radiusSecret',
        'vlan_id',
        'admin_id',
        'updated_at',
        'deleted_at',
      ]);
      bump(stats, 'inserted', result.inserted);
      bump(stats, 'updated', result.updated);
    } catch (err) {
      issue(
        ctx.report,
        'WifiStation',
        'warn',
        `Batch upsert failed, fell back row-by-row: ${(err as Error).message}`,
      );
      for (const row of batch) {
        const oldId = String(row.id);
        const orgId = String(row.orgId);
        const code = String(row.code);
        const values = [
          oldId,
          orgId,
          code,
          String(row.name),
          asString(row.location),
          asString(row.address),
          asString(row.status) ?? 'ACTIVE',
          ctx.defaultStationSizeId,
          asString(row.portalBaseUrl),
          asString(row.nasIdentifier),
          asString(row.radiusClientIp),
          asString(row.radiusSecret),
          row.vlanId == null ? null : String(row.vlanId),
          mapAdminId(ctx, asString(row.adminId)),
          null,
          asDate(row.createdAt) ?? new Date(),
          asDate(row.updatedAt) ?? new Date(),
          asDate(row.deletedAt),
        ];
        try {
          const result = await bulkUpsertById(ctx.newPool, 'wf_station', stationColumns, [values], [
            'org_id',
            'code',
            'name',
            'location',
            'address',
            'status',
            'station_size_id',
            'portalBaseUrl',
            'nasIdentifier',
            'radiusClientIp',
            'radiusSecret',
            'vlan_id',
            'admin_id',
            'updated_at',
            'deleted_at',
          ]);
          bump(stats, 'inserted', result.inserted);
          bump(stats, 'updated', result.updated);
        } catch (rowErr) {
          // org+code already taken by a different id — keep NEW id and remap.
          const existing = await ctx.newPool.query<{ id: string }>(
            `SELECT id FROM wf_station WHERE org_id = $1 AND code = $2 LIMIT 1`,
            [orgId, code],
          );
          const existingId = existing.rows[0]?.id;
          if (existingId && existingId !== oldId) {
            await ctx.newPool.query(
              `UPDATE wf_station SET
                 name = $3,
                 location = $4,
                 address = $5,
                 status = $6,
                 "portalBaseUrl" = $7,
                 "nasIdentifier" = $8,
                 "radiusClientIp" = $9,
                 "radiusSecret" = $10,
                 vlan_id = $11,
                 admin_id = $12,
                 updated_at = $13,
                 deleted_at = $14
               WHERE id = $1 AND org_id = $2`,
              [
                existingId,
                orgId,
                String(row.name),
                asString(row.location),
                asString(row.address),
                asString(row.status) ?? 'ACTIVE',
                asString(row.portalBaseUrl),
                asString(row.nasIdentifier),
                asString(row.radiusClientIp),
                asString(row.radiusSecret),
                row.vlanId == null ? null : String(row.vlanId),
                mapAdminId(ctx, asString(row.adminId)),
                asDate(row.updatedAt) ?? new Date(),
                asDate(row.deletedAt),
              ],
            );
            ctx.stationIdMap.set(oldId, existingId);
            bump(stats, 'updated');
            issue(
              ctx.report,
              'WifiStation',
              'warn',
              `Remapped station ${code}: OLD ${oldId} → NEW ${existingId}`,
              oldId,
            );
          } else {
            bump(stats, 'errors');
            issue(ctx.report, 'WifiStation', 'error', (rowErr as Error).message, oldId);
          }
        }
      }
    }
  }
  stats.source = source;

  // Devices
  if (!ctx.old.hasTable('wf_station_device')) return;
  const deviceFields = [
    'id',
    'orgId',
    'stationId',
    'type',
    'vendor',
    'model',
    'serialNo',
    'macAddr',
    'ipAddr',
    'note',
    'isRadiusClient',
    'radiusSecret',
    'nasShortname',
    'nasType',
    'nasPorts',
    'nasServer',
    'nasCommunity',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];
  const dWhere = childOrgWhere(ctx, 'wf_station_device');
  let dSource = 0;
  const deviceColumns = [
    'id',
    'org_id',
    'station_id',
    'type',
    'vendor',
    'model',
    'serial_no',
    'mac_addr',
    'ip_addr',
    'note',
    'is_radius_client',
    'radius_secret',
    'nas_shortname',
    'nas_type',
    'nas_ports',
    'nas_server',
    'nas_community',
    'created_at',
    'updated_at',
    'deleted_at',
  ];

  for await (const batch of ctx.old.paginate<Record<string, unknown>>(
    'wf_station_device',
    deviceFields,
    { whereSql: dWhere.sql, params: dWhere.params, batchSize: ctx.batchSize },
  )) {
    dSource += batch.length;
    if (!ctx.apply) {
      bump(deviceStats, 'inserted', batch.length);
      continue;
    }
    const rows = batch.map((row) => [
      String(row.id),
      String(row.orgId),
      mapStationId(ctx, asString(row.stationId)),
      asString(row.type) ?? 'ROUTER',
      asString(row.vendor),
      asString(row.model),
      asString(row.serialNo),
      asString(row.macAddr),
      asString(row.ipAddr),
      asString(row.note),
      asBool(row.isRadiusClient),
      asString(row.radiusSecret),
      asString(row.nasShortname),
      asString(row.nasType) ?? 'other',
      asInt(row.nasPorts),
      asString(row.nasServer),
      asString(row.nasCommunity),
      asDate(row.createdAt) ?? new Date(),
      asDate(row.updatedAt) ?? new Date(),
      asDate(row.deletedAt),
    ]);
    try {
      const result = await bulkUpsertById(ctx.newPool, 'wf_station_device', deviceColumns, rows, [
        'org_id',
        'station_id',
        'type',
        'vendor',
        'model',
        'serial_no',
        'mac_addr',
        'ip_addr',
        'note',
        'is_radius_client',
        'radius_secret',
        'nas_shortname',
        'nas_type',
        'nas_ports',
        'nas_server',
        'nas_community',
        'updated_at',
        'deleted_at',
      ]);
      bump(deviceStats, 'inserted', result.inserted);
      bump(deviceStats, 'updated', result.updated);
    } catch (err) {
      bump(deviceStats, 'errors', batch.length);
      issue(ctx.report, 'StationDevice', 'error', (err as Error).message);
    }
  }
  deviceStats.source = dSource;
}

/* -------------------------------------------------------------------------- */
/* Membership                                                                 */
/* -------------------------------------------------------------------------- */

async function importMembership(ctx: Ctx): Promise<void> {
  const memberStats = ensureStats(ctx.report, 'OrgMember');
  const roleStats = ensureStats(ctx.report, 'OrgMemberRole');
  if (!ctx.apply) {
    // Estimate from admin links
    const orgAdmins = ctx.orgIds
      ? await ctx.old.count(
          'wf_org',
          `WHERE ${ctx.old.q(ctx.old.col('wf_org', 'id')!)} = ANY($1::text[]) AND ${ctx.old.q(ctx.old.col('wf_org', 'adminId')!)} IS NOT NULL`,
          [ctx.orgIds],
        )
      : await ctx.old.count(
          'wf_org',
          `WHERE ${ctx.old.q(ctx.old.col('wf_org', 'adminId')!)} IS NOT NULL`,
        );
    memberStats.source = orgAdmins;
    bump(memberStats, 'inserted', orgAdmins);
    return;
  }

  const orgs = await ctx.prisma.org.findMany({
    where: ctx.orgIds ? { id: { in: ctx.orgIds } } : undefined,
    select: { id: true, adminId: true },
  });

  for (const org of orgs) {
    const links: Array<{
      adminId: string;
      roleCode: string;
      scopeKey: string;
      stationId?: string | null;
      resellerId?: string | null;
      isPrimary?: boolean;
      title?: string;
    }> = [];

    if (org.adminId) {
      links.push({
        adminId: org.adminId,
        roleCode: WIFI_ROLE.ORG_ADMIN,
        scopeKey: '',
        isPrimary: true,
        title: 'Organization Admin',
      });
    }

    const stations = await ctx.prisma.wifiStation.findMany({
      where: { orgId: org.id, adminId: { not: null } },
      select: { id: true, adminId: true },
    });
    for (const st of stations) {
      if (!st.adminId) continue;
      links.push({
        adminId: st.adminId,
        roleCode: WIFI_ROLE.STATION_OPS,
        scopeKey: stationScopeKey(st.id),
        stationId: st.id,
        title: 'Station Ops',
      });
    }

    const resellers = await ctx.prisma.reseller.findMany({
      where: { orgId: org.id, adminId: { not: null } },
      select: { id: true, adminId: true },
    });
    for (const rs of resellers) {
      if (!rs.adminId) continue;
      links.push({
        adminId: rs.adminId,
        roleCode: WIFI_ROLE.PARTNER,
        scopeKey: resellerScopeKey(rs.id),
        resellerId: rs.id,
        title: 'Partner',
      });
    }

    // Group by adminId
    const byAdmin = new Map<string, typeof links>();
    for (const link of links) {
      const list = byAdmin.get(link.adminId) ?? [];
      list.push(link);
      byAdmin.set(link.adminId, list);
    }

    for (const [adminId, adminLinks] of byAdmin) {
      memberStats.source += 1;
      try {
        const primary = adminLinks.some((l) => l.isPrimary);
        let member = await ctx.prisma.orgMember.findFirst({
          where: { orgId: org.id, adminId },
          select: { id: true },
        });
        if (member) {
          await ctx.prisma.orgMember.update({
            where: { id: member.id },
            data: {
              status: 'ACTIVE',
              isPrimary: primary,
              title: adminLinks.find((l) => l.isPrimary)?.title ?? adminLinks[0]?.title,
              deletedAt: null,
            },
          });
          bump(memberStats, 'updated');
        } else {
          member = await ctx.prisma.orgMember.create({
            data: {
              orgId: org.id,
              adminId,
              status: 'ACTIVE',
              isPrimary: primary,
              title: adminLinks.find((l) => l.isPrimary)?.title ?? adminLinks[0]?.title,
              joinedAt: new Date(),
            },
            select: { id: true },
          });
          bump(memberStats, 'inserted');
        }

        for (const link of adminLinks) {
          roleStats.source += 1;
          const existingRole = await ctx.prisma.orgMemberRole.findFirst({
            where: {
              orgMemberId: member.id,
              roleCode: link.roleCode,
              scopeKey: link.scopeKey,
            },
            select: { id: true },
          });
          if (existingRole) {
            await ctx.prisma.orgMemberRole.update({
              where: { id: existingRole.id },
              data: {
                stationId: link.stationId ?? null,
                resellerId: link.resellerId ?? null,
                isActive: true,
                deletedAt: null,
              },
            });
            bump(roleStats, 'updated');
          } else {
            await ctx.prisma.orgMemberRole.create({
              data: {
                orgId: org.id,
                orgMemberId: member.id,
                roleCode: link.roleCode,
                scopeKey: link.scopeKey,
                stationId: link.stationId ?? null,
                resellerId: link.resellerId ?? null,
                isActive: true,
              },
            });
            bump(roleStats, 'inserted');
          }

          if (link.stationId) {
            await ctx.prisma.orgMemberStation.upsert({
              where: {
                orgMemberId_stationId: {
                  orgMemberId: member.id,
                  stationId: link.stationId,
                },
              },
              create: {
                orgId: org.id,
                orgMemberId: member.id,
                stationId: link.stationId,
              },
              update: {},
            });
          }
        }
      } catch (err) {
        bump(memberStats, 'errors');
        issue(ctx.report, 'OrgMember', 'error', (err as Error).message, adminId);
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Plans + prices                                                             */
/* -------------------------------------------------------------------------- */

async function importPlansAndPrices(ctx: Ctx): Promise<void> {
  const planStats = ensureStats(ctx.report, 'Plan');
  const bookStats = ensureStats(ctx.report, 'PlanPriceBook');
  const priceStats = ensureStats(ctx.report, 'PlanPrice');

  // Plans
  if (ctx.old.hasTable('wf_plan')) {
    const fields = [
      'id',
      'orgId',
      'code',
      'name',
      'description',
      'quotaType',
      'timeAmount',
      'timeUnit',
      'dataMb',
      'validityDays',
      'maxDevices',
      'timeUsageMode',
      'isActive',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_plan');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'code',
      'name',
      'description',
      'quota_type',
      'time_amount',
      'time_unit',
      'data_mb',
      'validity_days',
      'max_devices',
      'time_usage_mode',
      'is_active',
      'created_at',
      'updated_at',
      'deleted_at',
    ];

    for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_plan', fields, {
      whereSql: sql,
      params,
      batchSize: ctx.batchSize,
    })) {
      source += batch.length;
      if (!ctx.apply) {
        bump(planStats, 'inserted', batch.length);
        continue;
      }
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        String(row.code),
        String(row.name),
        asString(row.description),
        asString(row.quotaType) ?? 'TIME_ONLY',
        asInt(row.timeAmount),
        asString(row.timeUnit),
        asInt(row.dataMb),
        asInt(row.validityDays, 1),
        asInt(row.maxDevices, 1),
        asString(row.timeUsageMode) ?? 'CUMULATIVE_SESSIONS',
        asBool(row.isActive, true),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_plan', columns, rows, [
          'org_id',
          'code',
          'name',
          'description',
          'quota_type',
          'time_amount',
          'time_unit',
          'data_mb',
          'validity_days',
          'max_devices',
          'time_usage_mode',
          'is_active',
          'updated_at',
          'deleted_at',
        ]);
        bump(planStats, 'inserted', result.inserted);
        bump(planStats, 'updated', result.updated);
      } catch (err) {
        bump(planStats, 'errors', batch.length);
        issue(ctx.report, 'Plan', 'error', (err as Error).message);
      }
    }
    planStats.source = source;
  }

  // Price books (drop agentId; station/reseller via junction tables)
  if (ctx.old.hasTable('wf_plan_price_book')) {
    const fields = [
      'id',
      'orgId',
      'name',
      'isDefault',
      'resellerId',
      'stationId',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_plan_price_book');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'name',
      'is_default',
      'created_at',
      'updated_at',
      'deleted_at',
    ];
    for await (const batch of ctx.old.paginate<Record<string, unknown>>(
      'wf_plan_price_book',
      fields,
      { whereSql: sql, params, batchSize: ctx.batchSize },
    )) {
      source += batch.length;
      if (!ctx.apply) {
        bump(bookStats, 'inserted', batch.length);
        continue;
      }
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        String(row.name),
        asBool(row.isDefault),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_plan_price_book', columns, rows, [
          'org_id',
          'name',
          'is_default',
          'updated_at',
          'deleted_at',
        ]);
        bump(bookStats, 'inserted', result.inserted);
        bump(bookStats, 'updated', result.updated);

        for (const row of batch) {
          const bookId = String(row.id);
          const stationId = mapStationId(ctx, asString(row.stationId));
          const resellerId = asString(row.resellerId);
          if (stationId) {
            await ctx.newPool.query(
              `INSERT INTO wf_plan_price_book_station (id, price_book_id, station_id, created_at)
               VALUES ($1,$2,$3,NOW())
               ON CONFLICT (price_book_id, station_id) DO NOTHING`,
              [crypto.randomUUID(), bookId, stationId],
            );
          }
          if (resellerId) {
            await ctx.newPool.query(
              `INSERT INTO wf_plan_price_book_reseller (id, price_book_id, reseller_id, created_at)
               VALUES ($1,$2,$3,NOW())
               ON CONFLICT (price_book_id, reseller_id) DO NOTHING`,
              [crypto.randomUUID(), bookId, resellerId],
            );
          }
        }
      } catch (err) {
        bump(bookStats, 'errors', batch.length);
        issue(ctx.report, 'PlanPriceBook', 'error', (err as Error).message);
      }
    }
    bookStats.source = source;
  }

  // Prices
  if (ctx.old.hasTable('wf_plan_price')) {
    const fields = [
      'id',
      'orgId',
      'priceBookId',
      'planId',
      'retailPrice',
      'costPrice',
      'isActive',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_plan_price');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'price_book_id',
      'plan_id',
      'retail_price',
      'cost_price',
      'is_active',
      'created_at',
      'updated_at',
      'deleted_at',
    ];
    for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_plan_price', fields, {
      whereSql: sql,
      params,
      batchSize: ctx.batchSize,
    })) {
      source += batch.length;
      if (!ctx.apply) {
        bump(priceStats, 'inserted', batch.length);
        continue;
      }
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        String(row.priceBookId),
        String(row.planId),
        asDecimalString(row.retailPrice),
        row.costPrice == null ? null : asDecimalString(row.costPrice),
        asBool(row.isActive, true),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_plan_price', columns, rows, [
          'org_id',
          'price_book_id',
          'plan_id',
          'retail_price',
          'cost_price',
          'is_active',
          'updated_at',
          'deleted_at',
        ]);
        bump(priceStats, 'inserted', result.inserted);
        bump(priceStats, 'updated', result.updated);
      } catch (err) {
        bump(priceStats, 'errors', batch.length);
        issue(ctx.report, 'PlanPrice', 'error', (err as Error).message);
      }
    }
    priceStats.source = source;
  }
}

/* -------------------------------------------------------------------------- */
/* Reseller entitlements + ResellerStation                                    */
/* -------------------------------------------------------------------------- */

async function importResellerEntitlementsAndStations(ctx: Ctx): Promise<void> {
  const entStats = ensureStats(ctx.report, 'ResellerPlanEntitlement');
  const rsStats = ensureStats(ctx.report, 'ResellerStation');

  if (ctx.old.hasTable('wf_reseller_plan_entitlement')) {
    // OLD may lack orgId — join via reseller
    const hasOrgId = ctx.old.hasColumn('wf_reseller_plan_entitlement', 'orgId');
    const resellerOrgCol = ctx.old.col('wf_reseller', 'orgId')!;
    const entResellerCol = ctx.old.col('wf_reseller_plan_entitlement', 'resellerId')!;
    const fields = ['id', 'resellerId', 'planId', 'isEnabled', 'createdAt', 'updatedAt'];
    if (hasOrgId) fields.splice(1, 0, 'orgId');

    let whereSql = '';
    const params: unknown[] = [];
    const whereParts: string[] = [];
    if (ctx.orgIds?.length) {
      whereParts.push(`e.${ctx.old.q(entResellerCol)} IN (
        SELECT ${ctx.old.q(ctx.old.col('wf_reseller', 'id')!)} FROM ${ctx.old.q('wf_reseller')}
        WHERE ${ctx.old.q(resellerOrgCol)} = ANY($${params.length + 1}::text[])
      )`);
      params.push(ctx.orgIds);
    }
    if (ctx.since) {
      const created = ctx.old.col('wf_reseller_plan_entitlement', 'createdAt');
      const updated = ctx.old.col('wf_reseller_plan_entitlement', 'updatedAt');
      const cols = [updated, created].filter((c): c is string => Boolean(c));
      if (cols.length) {
        params.push(ctx.since);
        const p = `$${params.length}`;
        whereParts.push(
          cols.length === 1
            ? `e.${ctx.old.q(cols[0])} >= ${p}`
            : `(${cols.map((c) => `e.${ctx.old.q(c)} >= ${p}`).join(' OR ')})`,
        );
      }
    }
    if (whereParts.length) whereSql = `WHERE ${whereParts.join(' AND ')}`;

    // Custom pagination because of alias
    const selectParts = fields
      .map((f) => {
        const physical = ctx.old.col('wf_reseller_plan_entitlement', f);
        if (!physical) return null;
        return `e.${ctx.old.q(physical)} AS ${ctx.old.q(f)}`;
      })
      .filter(Boolean);
    selectParts.push(`r.${ctx.old.q(resellerOrgCol)} AS ${ctx.old.q('orgIdFromReseller')}`);

    const idCol = ctx.old.col('wf_reseller_plan_entitlement', 'id')!;
    let lastId: string | null = null;
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'reseller_id',
      'plan_id',
      'is_enabled',
      'created_at',
      'updated_at',
    ];

    for (;;) {
      const pageParams = [...params];
      let keyset = '';
      if (lastId != null) {
        pageParams.push(lastId);
        keyset = `${whereSql ? 'AND' : 'WHERE'} e.${ctx.old.q(idCol)} > $${pageParams.length}`;
      }
      pageParams.push(ctx.batchSize);
      const sql = `
        SELECT ${selectParts.join(', ')}
        FROM ${ctx.old.q('wf_reseller_plan_entitlement')} e
        JOIN ${ctx.old.q('wf_reseller')} r
          ON r.${ctx.old.q(ctx.old.col('wf_reseller', 'id')!)} = e.${ctx.old.q(entResellerCol)}
        ${whereSql}
        ${keyset}
        ORDER BY e.${ctx.old.q(idCol)}
        LIMIT $${pageParams.length}
      `;
      const batch = await ctx.old.query<Record<string, unknown>>(sql, pageParams);
      if (!batch.length) break;
      source += batch.length;

      if (ctx.apply) {
        const rows = batch.map((row) => [
          String(row.id),
          asString(row.orgId) ?? String(row.orgIdFromReseller),
          String(row.resellerId),
          String(row.planId),
          asBool(row.isEnabled, true),
          asDate(row.createdAt) ?? new Date(),
          asDate(row.updatedAt) ?? new Date(),
        ]);
        try {
          const result = await bulkUpsertById(
            ctx.newPool,
            'wf_reseller_plan_entitlement',
            columns,
            rows,
            ['org_id', 'reseller_id', 'plan_id', 'is_enabled', 'updated_at'],
          );
          bump(entStats, 'inserted', result.inserted);
          bump(entStats, 'updated', result.updated);
        } catch (err) {
          issue(
            ctx.report,
            'ResellerPlanEntitlement',
            'warn',
            `Batch upsert failed, fell back: ${(err as Error).message}`,
          );
          for (const row of batch) {
            try {
              await ctx.newPool.query(
                `INSERT INTO wf_reseller_plan_entitlement (
                   id, org_id, reseller_id, plan_id, is_enabled, created_at, updated_at
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (reseller_id, plan_id) DO UPDATE SET
                   is_enabled = EXCLUDED.is_enabled,
                   updated_at = EXCLUDED.updated_at`,
                [
                  String(row.id),
                  asString(row.orgId) ?? String(row.orgIdFromReseller),
                  String(row.resellerId),
                  String(row.planId),
                  asBool(row.isEnabled, true),
                  asDate(row.createdAt) ?? new Date(),
                  asDate(row.updatedAt) ?? new Date(),
                ],
              );
              bump(entStats, 'updated');
            } catch (rowErr) {
              bump(entStats, 'errors');
              issue(
                ctx.report,
                'ResellerPlanEntitlement',
                'error',
                (rowErr as Error).message,
                String(row.id),
              );
            }
          }
        }
      } else {
        bump(entStats, 'inserted', batch.length);
      }

      lastId = String(batch[batch.length - 1].id);
      if (batch.length < ctx.batchSize) break;
    }
    entStats.source = source;
  }

  // Explode Reseller.stationIds → ResellerStation
  if (!ctx.apply) return;
  const resellers = await ctx.prisma.reseller.findMany({
    where: ctx.orgIds ? { orgId: { in: ctx.orgIds } } : undefined,
    select: { id: true, orgId: true, stationIds: true },
  });
  for (const rs of resellers) {
    const stationIds = parseStationIdsJson(rs.stationIds).map(
      (id) => mapStationId(ctx, id) ?? id,
    );
    for (const stationId of stationIds) {
      rsStats.source += 1;
      try {
        const station = await ctx.prisma.wifiStation.findUnique({
          where: { id: stationId },
          select: { id: true, orgId: true },
        });
        if (!station || station.orgId !== rs.orgId) {
          bump(rsStats, 'skipped');
          issue(
            ctx.report,
            'ResellerStation',
            'warn',
            `Skipping station ${stationId} for reseller ${rs.id} (missing or wrong org)`,
          );
          continue;
        }
        await ctx.prisma.resellerStation.upsert({
          where: {
            resellerId_stationId: { resellerId: rs.id, stationId },
          },
          create: {
            orgId: rs.orgId,
            resellerId: rs.id,
            stationId,
          },
          update: { deletedAt: null },
        });
        bump(rsStats, 'inserted');
      } catch (err) {
        bump(rsStats, 'errors');
        issue(ctx.report, 'ResellerStation', 'error', (err as Error).message);
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Voucher batches                                                            */
/* -------------------------------------------------------------------------- */

async function importVoucherBatches(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'VoucherBatch');
  if (!ctx.old.hasTable('wf_voucher_batch')) return;
  const fields = [
    'id',
    'orgId',
    'batchNo',
    'planId',
    'quantity',
    'remainingQuantity',
    'prefix',
    'note',
    'stationId',
    'resellerId',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];
  const { sql, params } = childOrgWhere(ctx, 'wf_voucher_batch');
  let source = 0;
  const columns = [
    'id',
    'org_id',
    'batch_no',
    'plan_id',
    'quantity',
    'remaining_quantity',
    'prefix',
    'note',
    'station_id',
    'reseller_id',
    'created_at',
    'updated_at',
    'deleted_at',
  ];

  for await (const batch of ctx.old.paginate<Record<string, unknown>>(
    'wf_voucher_batch',
    fields,
    { whereSql: sql, params, batchSize: ctx.batchSize },
  )) {
    source += batch.length;
    if (!ctx.apply) {
      bump(stats, 'inserted', batch.length);
      continue;
    }
    const rows = batch.map((row) => {
      const qty = asInt(row.quantity, 0) ?? 0;
      const remaining = asInt(row.remainingQuantity, qty) ?? qty;
      return [
        String(row.id),
        String(row.orgId),
        String(row.batchNo),
        String(row.planId),
        qty,
        remaining,
        asString(row.prefix),
        asString(row.note),
        mapStationId(ctx, asString(row.stationId)),
        asString(row.resellerId),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ];
    });
    try {
      const result = await bulkUpsertById(ctx.newPool, 'wf_voucher_batch', columns, rows, [
        'org_id',
        'batch_no',
        'plan_id',
        'quantity',
        'remaining_quantity',
        'prefix',
        'note',
        'station_id',
        'reseller_id',
        'updated_at',
        'deleted_at',
      ]);
      bump(stats, 'inserted', result.inserted);
      bump(stats, 'updated', result.updated);
    } catch (err) {
      bump(stats, 'errors', batch.length);
      issue(ctx.report, 'VoucherBatch', 'error', (err as Error).message);
    }
  }
  stats.source = source;
}

/* -------------------------------------------------------------------------- */
/* Credentials (large)                                                        */
/* -------------------------------------------------------------------------- */

async function importCredentials(ctx: Ctx): Promise<void> {
  const stats = ensureStats(ctx.report, 'Credential');
  if (!ctx.old.hasTable('wf_credential')) return;

  const hasVoucherBatch = ctx.old.hasColumn('wf_credential', 'voucherBatchId');
  if (!hasVoucherBatch) {
    ctx.report.notes.push(
      'OLD wf_credential has no voucherBatchId — batches imported without credential links',
    );
  }

  if (!ctx.apply) {
    const { sql, params } = childOrgWhere(ctx, 'wf_credential');
    stats.source = await ctx.old.count('wf_credential', sql, params);
    bump(stats, 'inserted', stats.source);
    return;
  }

  const fields = [
    'id',
    'orgId',
    'type',
    'status',
    'planId',
    'token',
    'username',
    'passwordHash',
    'stationId',
    'resellerId',
    'soldAt',
    'activatedAt',
    'expiresAt',
    'revokedAt',
    'singleSessionResellerUnlockAt',
    'timeRemainingSec',
    'dataRemainingMb',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];
  if (hasVoucherBatch) fields.push('voucherBatchId');

  const { sql, params } = childOrgWhere(ctx, 'wf_credential');
  let source = 0;
  // Live NEW has timeRemainingSec camelCase quirk
  const columns = [
    'id',
    'org_id',
    'type',
    'status',
    'plan_id',
    'token',
    'username',
    'password_hash',
    'station_id',
    'reseller_id',
    'voucher_batch_id',
    'sold_at',
    'activated_at',
    'expires_at',
    'revoked_at',
    'single_session_reseller_unlock_at',
    'timeRemainingSec',
    'data_remaining_mb',
    'created_at',
    'updated_at',
    'deleted_at',
  ];

  const batchSize = Math.min(ctx.batchSize, 1000);
  for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_credential', fields, {
    whereSql: sql,
    params,
    batchSize,
  })) {
    source += batch.length;
    if (source % 50_000 < batch.length) {
      console.log(`  Credential progress: ${source}`);
    }

    const rows = batch.map((row) => [
      String(row.id),
      String(row.orgId),
      asString(row.type) ?? 'VOUCHER_TOKEN',
      normalizeCredentialStatus(asString(row.status)),
      String(row.planId),
      asString(row.token),
      asString(row.username),
      asString(row.passwordHash),
      mapStationId(ctx, asString(row.stationId)),
      asString(row.resellerId),
      hasVoucherBatch ? asString(row.voucherBatchId) : null,
      asDate(row.soldAt),
      asDate(row.activatedAt),
      asDate(row.expiresAt),
      asDate(row.revokedAt),
      asDate(row.singleSessionResellerUnlockAt),
      asInt(row.timeRemainingSec),
      asInt(row.dataRemainingMb),
      asDate(row.createdAt) ?? new Date(),
      asDate(row.updatedAt) ?? new Date(),
      asDate(row.deletedAt),
    ]);

    try {
      const result = await bulkUpsertById(ctx.newPool, 'wf_credential', columns, rows, [
        'org_id',
        'type',
        'status',
        'plan_id',
        'token',
        'username',
        'password_hash',
        'station_id',
        'reseller_id',
        'voucher_batch_id',
        'sold_at',
        'activated_at',
        'expires_at',
        'revoked_at',
        'single_session_reseller_unlock_at',
        'timeRemainingSec',
        'data_remaining_mb',
        'updated_at',
        'deleted_at',
      ]);
      bump(stats, 'inserted', result.inserted);
      bump(stats, 'updated', result.updated);
    } catch (err) {
      issue(
        ctx.report,
        'Credential',
        'warn',
        `Batch upsert failed, fell back row-by-row: ${(err as Error).message}`,
      );
      for (const row of rows) {
        try {
          const result = await bulkUpsertById(ctx.newPool, 'wf_credential', columns, [row], [
            'org_id',
            'type',
            'status',
            'plan_id',
            'token',
            'username',
            'password_hash',
            'station_id',
            'reseller_id',
            'voucher_batch_id',
            'sold_at',
            'activated_at',
            'expires_at',
            'revoked_at',
            'single_session_reseller_unlock_at',
            'timeRemainingSec',
            'data_remaining_mb',
            'updated_at',
            'deleted_at',
          ]);
          bump(stats, 'inserted', result.inserted);
          bump(stats, 'updated', result.updated);
        } catch (rowErr) {
          bump(stats, 'errors');
          if (stats.errors <= 25) {
            issue(ctx.report, 'Credential', 'error', (rowErr as Error).message, String(row[0]));
          }
        }
      }
      if (stats.errors > 50_000) {
        issue(ctx.report, 'Credential', 'error', 'Too many credential errors; aborting further batches');
        break;
      }
    }
  }
  stats.source = source;
}

/* -------------------------------------------------------------------------- */
/* Sales / payments                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Delta catch-up: sale items/payments updated after --since may reference older
 * orders that were not re-selected by the order since-filter. Pull those parents.
 */
async function ensureParentSaleOrdersForDelta(ctx: Ctx): Promise<void> {
  if (!ctx.apply || !ctx.since || !ctx.old.hasTable('wf_sale_order')) return;

  const orderIds = new Set<string>();
  if (ctx.old.hasTable('wf_sale_item')) {
    const w = childOrgWhere(ctx, 'wf_sale_item');
    const orderCol = ctx.old.col('wf_sale_item', 'orderId');
    if (orderCol) {
      const rows = await ctx.old.query<{ order_id: string }>(
        `SELECT DISTINCT ${ctx.old.q(orderCol)} AS order_id
         FROM ${ctx.old.q('wf_sale_item')} ${w.sql}`,
        w.params,
      );
      for (const r of rows) {
        if (r.order_id) orderIds.add(String(r.order_id));
      }
    }
  }
  if (ctx.old.hasTable('wf_payment')) {
    const w = childOrgWhere(ctx, 'wf_payment');
    const orderCol = ctx.old.col('wf_payment', 'orderId');
    if (orderCol) {
      const rows = await ctx.old.query<{ order_id: string }>(
        `SELECT DISTINCT ${ctx.old.q(orderCol)} AS order_id
         FROM ${ctx.old.q('wf_payment')} ${w.sql}`,
        w.params,
      );
      for (const r of rows) {
        if (r.order_id) orderIds.add(String(r.order_id));
      }
    }
  }

  if (!orderIds.size) return;
  const ids = [...orderIds];
  const existing = await ctx.newPool.query<{ id: string }>(
    `SELECT id FROM wf_sale_order WHERE id = ANY($1::text[])`,
    [ids],
  );
  const have = new Set(existing.rows.map((r) => r.id));
  const missing = ids.filter((id) => !have.has(id));
  if (!missing.length) return;

  ctx.report.notes.push(
    `Delta: importing ${missing.length} parent SaleOrder row(s) referenced by newer items/payments`,
  );

  const fields = [
    'id',
    'orgId',
    'orderNo',
    'status',
    'resellerId',
    'stationId',
    'subtotal',
    'discount',
    'total',
    'currency',
    'note',
    'soldAt',
    'createdAt',
    'updatedAt',
  ];
  const select = ctx.old.selectList('wf_sale_order', fields);
  const idCol = ctx.old.col('wf_sale_order', 'id')!;
  const oldRows = await ctx.old.query<Record<string, unknown>>(
    `SELECT ${select} FROM ${ctx.old.q('wf_sale_order')}
     WHERE ${ctx.old.q(idCol)} = ANY($1::text[])`,
    [missing],
  );

  const columns = [
    'id',
    'org_id',
    'order_no',
    'status',
    'reseller_id',
    'station_id',
    'subtotal',
    'discount',
    'total',
    'currency',
    'note',
    'sold_at',
    'created_at',
    'updated_at',
  ];
  const rows = oldRows.map((row) => [
    String(row.id),
    String(row.orgId),
    String(row.orderNo),
    asString(row.status) ?? 'DRAFT',
    asString(row.resellerId),
    mapStationId(ctx, asString(row.stationId)),
    asDecimalString(row.subtotal),
    asDecimalString(row.discount),
    asDecimalString(row.total),
    asString(row.currency) ?? 'MMK',
    asString(row.note),
    asDate(row.soldAt),
    asDate(row.createdAt) ?? new Date(),
    asDate(row.updatedAt) ?? new Date(),
  ]);

  for (let i = 0; i < rows.length; i += ctx.batchSize) {
    const chunk = rows.slice(i, i + ctx.batchSize);
    await bulkUpsertById(ctx.newPool, 'wf_sale_order', columns, chunk, [
      'org_id',
      'order_no',
      'status',
      'reseller_id',
      'station_id',
      'subtotal',
      'discount',
      'total',
      'currency',
      'note',
      'sold_at',
      'updated_at',
    ]);
  }
}

async function importSales(ctx: Ctx): Promise<void> {
  const orderStats = ensureStats(ctx.report, 'SaleOrder');
  const itemStats = ensureStats(ctx.report, 'SaleItem');
  const payStats = ensureStats(ctx.report, 'Payment');

  if (!ctx.apply) {
    if (ctx.old.hasTable('wf_sale_order')) {
      const w = childOrgWhere(ctx, 'wf_sale_order');
      orderStats.source = await ctx.old.count('wf_sale_order', w.sql, w.params);
      bump(orderStats, 'inserted', orderStats.source);
    }
    if (ctx.old.hasTable('wf_sale_item')) {
      const w = childOrgWhere(ctx, 'wf_sale_item');
      itemStats.source = await ctx.old.count('wf_sale_item', w.sql, w.params);
      bump(itemStats, 'inserted', itemStats.source);
    }
    if (ctx.old.hasTable('wf_payment')) {
      const w = childOrgWhere(ctx, 'wf_payment');
      payStats.source = await ctx.old.count('wf_payment', w.sql, w.params);
      bump(payStats, 'inserted', payStats.source);
    }
    return;
  }

  await ensureParentSaleOrdersForDelta(ctx);

  if (ctx.old.hasTable('wf_sale_order')) {
    const fields = [
      'id',
      'orgId',
      'orderNo',
      'status',
      'resellerId',
      'stationId',
      'subtotal',
      'discount',
      'total',
      'currency',
      'note',
      'soldAt',
      'createdAt',
      'updatedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_sale_order');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'order_no',
      'status',
      'reseller_id',
      'station_id',
      'subtotal',
      'discount',
      'total',
      'currency',
      'note',
      'sold_at',
      'created_at',
      'updated_at',
    ];
    const batchSize = Math.min(ctx.batchSize, 1000);

    for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_sale_order', fields, {
      whereSql: sql,
      params,
      batchSize,
    })) {
      source += batch.length;
      if (source % 50_000 < batch.length) console.log(`  SaleOrder progress: ${source}`);
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        String(row.orderNo),
        asString(row.status) ?? 'DRAFT',
        asString(row.resellerId),
        mapStationId(ctx, asString(row.stationId)),
        asDecimalString(row.subtotal),
        asDecimalString(row.discount),
        asDecimalString(row.total),
        asString(row.currency) ?? 'MMK',
        asString(row.note),
        asDate(row.soldAt),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_sale_order', columns, rows, [
          'org_id',
          'order_no',
          'status',
          'reseller_id',
          'station_id',
          'subtotal',
          'discount',
          'total',
          'currency',
          'note',
          'sold_at',
          'updated_at',
        ]);
        bump(orderStats, 'inserted', result.inserted);
        bump(orderStats, 'updated', result.updated);
      } catch (err) {
        bump(orderStats, 'errors', batch.length);
        issue(ctx.report, 'SaleOrder', 'error', (err as Error).message);
        if (orderStats.errors > 10_000) break;
      }
    }
    orderStats.source = source;
  }

  if (ctx.old.hasTable('wf_sale_item')) {
    const fields = [
      'id',
      'orgId',
      'orderId',
      'planId',
      'credentialId',
      'qty',
      'unitPrice',
      'lineTotal',
      'createdAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_sale_item');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'order_id',
      'plan_id',
      'credential_id',
      'qty',
      'unit_price',
      'line_total',
      'created_at',
    ];
    const batchSize = Math.min(ctx.batchSize, 1000);
    for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_sale_item', fields, {
      whereSql: sql,
      params,
      batchSize,
    })) {
      source += batch.length;
      if (source % 50_000 < batch.length) console.log(`  SaleItem progress: ${source}`);
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        String(row.orderId),
        String(row.planId),
        asString(row.credentialId),
        asInt(row.qty, 1) ?? 1,
        asDecimalString(row.unitPrice),
        asDecimalString(row.lineTotal),
        asDate(row.createdAt) ?? new Date(),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_sale_item', columns, rows, [
          'org_id',
          'order_id',
          'plan_id',
          'credential_id',
          'qty',
          'unit_price',
          'line_total',
        ]);
        bump(itemStats, 'inserted', result.inserted);
        bump(itemStats, 'updated', result.updated);
      } catch (err) {
        bump(itemStats, 'errors', batch.length);
        issue(ctx.report, 'SaleItem', 'error', (err as Error).message);
        if (itemStats.errors > 10_000) break;
      }
    }
    itemStats.source = source;
  }

  if (ctx.old.hasTable('wf_payment')) {
    const fields = [
      'id',
      'orgId',
      'orderId',
      'method',
      'amount',
      'refNo',
      'paidAt',
      'note',
      'createdAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_payment');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'order_id',
      'method',
      'amount',
      'ref_no',
      'paid_at',
      'note',
      'created_at',
    ];
    const batchSize = Math.min(ctx.batchSize, 1000);
    for await (const batch of ctx.old.paginate<Record<string, unknown>>('wf_payment', fields, {
      whereSql: sql,
      params,
      batchSize,
    })) {
      source += batch.length;
      if (source % 50_000 < batch.length) console.log(`  Payment progress: ${source}`);
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        asString(row.orderId),
        asString(row.method) ?? 'CASH',
        asDecimalString(row.amount),
        asString(row.refNo),
        asDate(row.paidAt) ?? new Date(),
        asString(row.note),
        asDate(row.createdAt) ?? new Date(),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_payment', columns, rows, [
          'org_id',
          'order_id',
          'method',
          'amount',
          'ref_no',
          'paid_at',
          'note',
        ]);
        bump(payStats, 'inserted', result.inserted);
        bump(payStats, 'updated', result.updated);
      } catch (err) {
        bump(payStats, 'errors', batch.length);
        issue(ctx.report, 'Payment', 'error', (err as Error).message);
        if (payStats.errors > 10_000) break;
      }
    }
    payStats.source = source;
  }
}

/* -------------------------------------------------------------------------- */
/* Commissions                                                                */
/* -------------------------------------------------------------------------- */

async function importCommissions(ctx: Ctx): Promise<void> {
  const ruleStats = ensureStats(ctx.report, 'CommissionRule');
  const payoutStats = ensureStats(ctx.report, 'CommissionPayout');

  if (ctx.old.hasTable('wf_commission_rule')) {
    const fields = [
      'id',
      'orgId',
      'resellerId',
      'planId',
      'type',
      'value',
      'isActive',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_commission_rule');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'reseller_id',
      'plan_id',
      'type',
      'value',
      'is_active',
      'created_at',
      'updated_at',
      'deleted_at',
    ];
    for await (const batch of ctx.old.paginate<Record<string, unknown>>(
      'wf_commission_rule',
      fields,
      { whereSql: sql, params, batchSize: ctx.batchSize },
    )) {
      source += batch.length;
      if (!ctx.apply) {
        bump(ruleStats, 'inserted', batch.length);
        continue;
      }
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        asString(row.resellerId),
        asString(row.planId),
        asString(row.type) ?? 'PERCENT',
        row.value == null ? '0' : String(row.value),
        asBool(row.isActive, true),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
        asDate(row.deletedAt),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_commission_rule', columns, rows, [
          'org_id',
          'reseller_id',
          'plan_id',
          'type',
          'value',
          'is_active',
          'updated_at',
          'deleted_at',
        ]);
        bump(ruleStats, 'inserted', result.inserted);
        bump(ruleStats, 'updated', result.updated);
      } catch (err) {
        bump(ruleStats, 'errors', batch.length);
        issue(ctx.report, 'CommissionRule', 'error', (err as Error).message);
      }
    }
    ruleStats.source = source;
  }

  if (ctx.old.hasTable('wf_commission_payout')) {
    const fields = [
      'id',
      'orgId',
      'resellerId',
      'periodFrom',
      'periodTo',
      'amount',
      'status',
      'paidAt',
      'note',
      'createdAt',
      'updatedAt',
    ];
    const { sql, params } = childOrgWhere(ctx, 'wf_commission_payout');
    let source = 0;
    const columns = [
      'id',
      'org_id',
      'reseller_id',
      'period_from',
      'period_to',
      'amount',
      'status',
      'paid_at',
      'note',
      'created_at',
      'updated_at',
    ];
    for await (const batch of ctx.old.paginate<Record<string, unknown>>(
      'wf_commission_payout',
      fields,
      { whereSql: sql, params, batchSize: ctx.batchSize },
    )) {
      source += batch.length;
      if (!ctx.apply) {
        bump(payoutStats, 'inserted', batch.length);
        continue;
      }
      const rows = batch.map((row) => [
        String(row.id),
        String(row.orgId),
        asString(row.resellerId),
        asDate(row.periodFrom) ?? new Date(),
        asDate(row.periodTo) ?? new Date(),
        asDecimalString(row.amount),
        asString(row.status) ?? 'PENDING',
        asDate(row.paidAt),
        asString(row.note),
        asDate(row.createdAt) ?? new Date(),
        asDate(row.updatedAt) ?? new Date(),
      ]);
      try {
        const result = await bulkUpsertById(ctx.newPool, 'wf_commission_payout', columns, rows, [
          'org_id',
          'reseller_id',
          'period_from',
          'period_to',
          'amount',
          'status',
          'paid_at',
          'note',
          'updated_at',
        ]);
        bump(payoutStats, 'inserted', result.inserted);
        bump(payoutStats, 'updated', result.updated);
      } catch (err) {
        bump(payoutStats, 'errors', batch.length);
        issue(ctx.report, 'CommissionPayout', 'error', (err as Error).message);
      }
    }
    payoutStats.source = source;
  }
}
