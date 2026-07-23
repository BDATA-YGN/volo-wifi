import { randomUUID } from 'crypto';
import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  enforceScopedOrgId,
  mergeNetworkOrgMeta,
  resolveNetworkOrgScope,
  scopedNetworkFormOrgs,
  toNetworkOrgMeta,
} from '@/features/wifi/network/shared/resolve-network-org';
import { NetworkRadiusPlanPoliciesBundleSchema } from './schema';

const orgSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.OrgSelect;

const planSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.PlanSelect;

const planFormSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  quotaType: true,
  timeAmount: true,
  timeUnit: true,
  dataMb: true,
  maxDevices: true,
  validityDays: true,
} satisfies Prisma.PlanSelect;

const stationSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
} satisfies Prisma.WifiStationSelect;

const vendorProfileSelect = {
  id: true,
  name: true,
  vendor: true,
  model: true,
} satisfies Prisma.RadiusVendorProfileSelect;

const attributeSelect = {
  id: true,
  phase: true,
  attributeName: true,
  op: true,
  valueType: true,
  value: true,
  priority: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlanRadiusAttributeSelect;

type AttrRow = Prisma.PlanRadiusAttributeGetPayload<{ select: typeof attributeSelect }>;

type BundleAttributeInput = {
  phase?: 'CHECK' | 'REPLY';
  attributeName: string;
  op?: string;
  valueType?: 'STRING' | 'INTEGER' | 'IPADDR' | 'DATE';
  value: string;
  priority?: number;
  note?: string | null;
};

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function buildWhere(
  query: AuthenticatedRequest['query'],
  orgId: string
): Prisma.PlanRadiusAttributeWhereInput {
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const vendorProfileId =
    typeof query.vendorProfileId === 'string' ? query.vendorProfileId.trim() : '';
  const wifiStationId =
    typeof query.wifiStationId === 'string' ? query.wifiStationId.trim() : '';
  const phase = typeof query.phase === 'string' ? query.phase.trim().toUpperCase() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where: Prisma.PlanRadiusAttributeWhereInput = { deletedAt: null, orgId };
  if (planId) where.planId = planId;
  if (vendorProfileId) where.vendorProfileId = vendorProfileId;
  if (wifiStationId) where.wifiStationId = wifiStationId;
  if (query.globalOnly === 'true') where.wifiStationId = null;
  if (phase) where.phase = phase as Prisma.EnumRadiusAttrPhaseFilter['equals'];

  if (search) {
    where.OR = [
      { attributeName: { contains: search, mode: 'insensitive' } },
      { value: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { vendorProfile: { name: { contains: search, mode: 'insensitive' } } },
      { wifiStation: { name: { contains: search, mode: 'insensitive' } } },
      { wifiStation: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function validatePolicyRefs(
  prisma: PrismaClient,
  orgId: string,
  planId: string,
  vendorProfileId: string,
  stationIds: string[]
): Promise<string | null> {
  const [plan, vendorProfile] = await Promise.all([
    prisma.plan.findFirst({
      where: { id: planId, orgId, deletedAt: null },
      select: { id: true },
    }),
    prisma.radiusVendorProfile.findFirst({
      where: { id: vendorProfileId, orgId, deletedAt: null },
      select: { id: true },
    }),
  ]);

  if (!plan) return 'Plan not found for this tenant.';
  if (!vendorProfile) return 'Vendor profile not found.';

  if (stationIds.length) {
    const found = await prisma.wifiStation.count({
      where: { id: { in: stationIds }, orgId, deletedAt: null },
    });
    if (found !== stationIds.length) {
      return 'One or more WiFi sites were not found for this tenant.';
    }
  }

  return null;
}

function normalizeAttributeRows(attributes: BundleAttributeInput[]) {
  const unique = new Set(attributes.map((a) => `${a.phase ?? 'REPLY'}::${a.attributeName}`));
  if (unique.size !== attributes.length) {
    throw new Error('Duplicate attribute name within the same phase is not allowed.');
  }
  return attributes.map((row) => ({
    phase: row.phase ?? ('REPLY' as const),
    attributeName: row.attributeName,
    op: row.op ?? ':=',
    valueType: row.valueType ?? ('STRING' as const),
    value: row.value,
    priority: row.priority ?? 100,
    note: row.note?.trim() || null,
  }));
}

async function replaceBundle(
  prisma: PrismaClient,
  input: {
    orgId: string;
    planId: string;
    vendorProfileId: string;
    stationIds: string[];
    policyBundleId: string;
    attributes: BundleAttributeInput[];
    previousBundleId?: string | null;
  }
) {
  const attrs = normalizeAttributeRows(input.attributes);
  const targets = input.stationIds.length ? input.stationIds : [null];

  return prisma.$transaction(async (tx) => {
    if (input.previousBundleId) {
      await tx.planRadiusAttribute.updateMany({
        where: {
          orgId: input.orgId,
          policyBundleId: input.previousBundleId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }

    const rows: Prisma.PlanRadiusAttributeCreateManyInput[] = [];
    for (const wifiStationId of targets) {
      for (const attr of attrs) {
        rows.push({
          orgId: input.orgId,
          planId: input.planId,
          vendorProfileId: input.vendorProfileId,
          wifiStationId,
          policyBundleId: input.policyBundleId,
          phase: attr.phase,
          attributeName: attr.attributeName,
          op: attr.op,
          valueType: attr.valueType,
          value: attr.value,
          priority: attr.priority,
          note: attr.note,
        });
      }
    }

    await tx.planRadiusAttribute.createMany({ data: rows });
  });
}

async function loadBundle(prisma: PrismaClient, orgId: string, policyBundleId: string) {
  const rows = await prisma.planRadiusAttribute.findMany({
    where: { orgId, policyBundleId, deletedAt: null },
    select: {
      ...attributeSelect,
      orgId: true,
      planId: true,
      vendorProfileId: true,
      wifiStationId: true,
      policyBundleId: true,
      org: { select: orgSelect },
      plan: { select: planSelect },
      vendorProfile: { select: vendorProfileSelect },
      wifiStation: { select: stationSelect },
    },
    orderBy: [{ priority: 'asc' }, { attributeName: 'asc' }],
  });

  if (!rows.length) return null;

  const first = rows[0]!;
  const stationMap = new Map<string, (typeof rows)[number]['wifiStation']>();
  for (const row of rows) {
    if (row.wifiStationId && row.wifiStation) {
      stationMap.set(row.wifiStationId, row.wifiStation);
    }
  }

  // Deduplicate attribute definitions (same across stations in a multi-site bundle).
  const attrKey = (a: AttrRow) => `${a.phase}::${a.attributeName}::${a.op}::${a.value}`;
  const seen = new Set<string>();
  const attributes: AttrRow[] = [];
  for (const row of rows) {
    const key = attrKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    attributes.push({
      id: row.id,
      phase: row.phase,
      attributeName: row.attributeName,
      op: row.op,
      valueType: row.valueType,
      value: row.value,
      priority: row.priority,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  const stations = [...stationMap.values()].filter(Boolean) as Prisma.WifiStationGetPayload<{
    select: typeof stationSelect;
  }>[];
  stations.sort((a, b) => a.code.localeCompare(b.code));

  return {
    policyBundleId,
    groupKey: policyBundleId,
    orgId: first.orgId,
    planId: first.planId,
    vendorProfileId: first.vendorProfileId,
    wifiStationId: stations.length === 1 ? stations[0]!.id : null,
    stationIds: stations.map((s) => s.id),
    org: first.org,
    plan: first.plan,
    vendorProfile: first.vendorProfile,
    wifiStation: stations.length === 1 ? stations[0]! : null,
    wifiStations: stations,
    isGlobal: stations.length === 0,
    attributeCount: attributes.length,
    attributes,
    updatedAt: rows.reduce(
      (max, row) => (row.updatedAt > max ? row.updatedAt : max),
      rows[0]!.updatedAt
    ),
  };
}

/** menus.wifi.network.radius.plan-policies @route /wifi/network/radius/plan-policies */
export class NetworkRadiusPlanPoliciesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if ('requiresOrgSelection' in scope) {
        if (req.query.formOptions === 'true') {
          return responseSuccess(res, {
            message: 'Success',
            data: {
              orgs: scope.memberships,
              plans: [],
              stations: [],
              vendorProfiles: [],
              catalogAttributes: [],
            },
            meta: toNetworkOrgMeta(scope),
          });
        }

        const { page, limit } = parsePagination(req.query);
        return responseSuccess(res, {
          message: 'Success',
          data: [],
          meta: mergeNetworkOrgMeta(scope, {
            page,
            limit,
            total: 0,
            totalPages: 1,
            policyGroups: 0,
            attributeRows: 0,
            plansWithPolicies: 0,
            phaseCounts: {},
          }),
        });
      }

      const { orgId } = scope;
      const orgScopeWhere = { deletedAt: null as null, orgId };

      if (req.query.formOptions === 'true') {
        const [plans, stations, vendorProfiles, catalogAttributes] = await Promise.all([
          this.prisma.plan.findMany({
            where: { orgId, deletedAt: null },
            select: planFormSelect,
            orderBy: { name: 'asc' },
          }),
          this.prisma.wifiStation.findMany({
            where: { orgId, deletedAt: null },
            select: stationSelect,
            orderBy: { name: 'asc' },
          }),
          this.prisma.radiusVendorProfile.findMany({
            where: { orgId, deletedAt: null },
            select: vendorProfileSelect,
            orderBy: [{ vendor: 'asc' }, { name: 'asc' }],
          }),
          this.prisma.routerSupportedAttribute.findMany({
            where: { orgId },
            select: {
              id: true,
              freeradiusName: true,
              displayName: true,
              op: true,
              valueType: true,
              defaultValue: true,
            },
            orderBy: { freeradiusName: 'asc' },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            orgs: scopedNetworkFormOrgs(scope),
            plans,
            stations,
            vendorProfiles,
            catalogAttributes,
          },
          meta: toNetworkOrgMeta(scope),
        });
      }

      const bundleIdParam =
        typeof req.query.policyBundleId === 'string'
          ? req.query.policyBundleId.trim()
          : typeof req.params?.id === 'string' && req.params.id.length > 0
            ? decodeURIComponent(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id)
            : null;

      if (bundleIdParam && !bundleIdParam.includes('::')) {
        const bundle = await loadBundle(this.prisma, orgId, bundleIdParam);
        if (!bundle) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Plan RADIUS policy group not found.',
          });
        }
        return responseSuccess(res, {
          message: 'Success',
          data: bundle,
          meta: toNetworkOrgMeta(scope),
        });
      }

      const where = buildWhere(req.query, orgId);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [allRows, phaseGroups, planCount, attributeRows] = await Promise.all([
        this.prisma.planRadiusAttribute.findMany({
          where,
          select: {
            policyBundleId: true,
            updatedAt: true,
          },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        this.prisma.planRadiusAttribute.groupBy({
          by: ['phase'],
          where: orgScopeWhere,
          _count: { _all: true },
        }),
        this.prisma.planRadiusAttribute.groupBy({
          by: ['planId'],
          where: orgScopeWhere,
          _count: { _all: true },
        }),
        this.prisma.planRadiusAttribute.count({ where: orgScopeWhere }),
      ]);

      const bundleOrder: string[] = [];
      const seenBundles = new Set<string>();
      for (const row of allRows) {
        if (seenBundles.has(row.policyBundleId)) continue;
        seenBundles.add(row.policyBundleId);
        bundleOrder.push(row.policyBundleId);
      }

      const total = bundleOrder.length;
      const pageBundleIds = bundleOrder.slice(skip, skip + take);
      const pageRows = (
        await Promise.all(pageBundleIds.map((id) => loadBundle(this.prisma, orgId, id)))
      ).filter(Boolean);

      const phaseCounts = Object.fromEntries(
        phaseGroups.map((row) => [row.phase, row._count._all])
      );

      responseSuccess(res, {
        message: 'Success',
        data: pageRows,
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          policyGroups: total,
          attributeRows,
          phaseCounts,
          plansWithPolicies: planCount.length,
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage plan RADIUS policies.',
        });
      }

      const { error, value } = NetworkRadiusPlanPoliciesBundleSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let scopedOrgId: string;
      try {
        scopedOrgId = enforceScopedOrgId(scope, (value.orgId as string | undefined) ?? null);
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 403, {
          code: e.code ?? 'FORBIDDEN_ORG',
          message: e.message ?? 'Organization scope mismatch.',
        });
      }

      const planId = value.planId as string;
      const vendorProfileId = value.vendorProfileId as string;
      const stationIds = [...new Set((value.stationIds as string[] | undefined) ?? [])];
      const previousBundleId = (value.policyBundleId as string | undefined) ?? null;
      const attributes = value.attributes as BundleAttributeInput[];

      if (previousBundleId) {
        const existing = await this.prisma.planRadiusAttribute.findFirst({
          where: {
            orgId: scopedOrgId,
            policyBundleId: previousBundleId,
            deletedAt: null,
          },
          select: { planId: true, vendorProfileId: true },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Plan RADIUS policy group not found.',
          });
        }
        // Plan / vendor are immutable on edit.
        if (existing.planId !== planId || existing.vendorProfileId !== vendorProfileId) {
          return responseError(res, 400, {
            code: 'IMMUTABLE_SCOPE',
            message: 'Plan and vendor profile cannot be changed when editing a policy.',
          });
        }
      }

      const refError = await validatePolicyRefs(
        this.prisma,
        scopedOrgId,
        planId,
        vendorProfileId,
        stationIds
      );
      if (refError) {
        return responseError(res, 400, { code: 'INVALID_REFS', message: refError });
      }

      const policyBundleId = previousBundleId ?? randomUUID();

      try {
        await replaceBundle(this.prisma, {
          orgId: scopedOrgId,
          planId,
          vendorProfileId,
          stationIds,
          policyBundleId,
          attributes,
          previousBundleId,
        });
      } catch (err) {
        return responseError(res, 400, {
          code: 'SAVE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to save policy group.',
        });
      }

      const bundle = await loadBundle(this.prisma, scopedOrgId, policyBundleId);
      responseSuccess(res, {
        message: previousBundleId ? 'Plan RADIUS policy updated' : 'Plan RADIUS policy saved',
        data: bundle,
      });
    }),
  ];

  public removeGroup = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage plan RADIUS policies.',
        });
      }

      const policyBundleId =
        typeof req.query.policyBundleId === 'string' ? req.query.policyBundleId.trim() : '';
      if (!policyBundleId) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'policyBundleId is required.',
        });
      }

      const result = await this.prisma.planRadiusAttribute.updateMany({
        where: {
          orgId: scope.orgId,
          policyBundleId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      if (result.count === 0) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Plan RADIUS policy group not found.',
        });
      }

      responseSuccess(res, {
        message: 'Plan RADIUS policy group removed',
        data: { removed: result.count },
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage plan RADIUS policies.',
        });
      }

      const rawId = req.params.id;
      const id = decodeURIComponent(Array.isArray(rawId) ? rawId[0]! : String(rawId ?? ''));

      // Prefer treating :id as policyBundleId.
      const byBundle = await this.prisma.planRadiusAttribute.updateMany({
        where: { orgId: scope.orgId, policyBundleId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (byBundle.count > 0) {
        return responseSuccess(res, {
          message: 'Plan RADIUS policy group removed',
          data: { removed: byBundle.count },
        });
      }

      const existing = await this.prisma.planRadiusAttribute.findFirst({
        where: { id, deletedAt: null, orgId: scope.orgId },
        select: { id: true },
      });
      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Plan RADIUS policy not found.',
        });
      }

      await this.prisma.planRadiusAttribute.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      responseSuccess(res, { message: 'Plan RADIUS policy removed' });
    }),
  ];
}
