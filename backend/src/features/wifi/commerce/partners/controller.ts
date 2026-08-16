import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  consoleUsernameTakenMessage,
  orgScopedCodeTakenMessage,
} from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { USER_STATUSES, type UserStatus } from './constants';
import {
  resolveAllowedStationIds,
  stationPkScope,
} from '@/features/wifi/shared/resolve-station-scope';
import {
  CommercePartnersCreateSchema,
  CommercePartnersUpdateSchema,
  CommercePartnersResetPasswordSchema,
} from './schema';
import { provisionPartnerPortalAccount } from './provision-portal-account';
import { hashPassword } from '@/utils/password';

const partnerCoreSelect = {
  id: true,
  orgId: true,
  code: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  status: true,
  adminId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResellerSelect;

/** Detail / delete guards — includes heavy credential & sales counts. */
const partnerDetailCountSelect = {
  resellerStations: { where: { deletedAt: null } },
  planEntitlements: { where: { isEnabled: true } },
  credentials: true,
  sales: true,
} satisfies Prisma.ResellerCountOutputTypeSelect;

const stationBriefSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
} satisfies Prisma.WifiStationSelect;

const planBriefSelect = {
  id: true,
  code: true,
  name: true,
  quotaType: true,
  isActive: true,
} satisfies Prisma.PlanSelect;

/**
 * List select intentionally omits `_count.credentials` / `_count.sales`.
 * Those correlated counts scan large tables per row and timed out (~30s)
 * with ~250 partners. Sales counts are batched via groupBy after the page load.
 */
const listPartnerSelect = {
  ...partnerCoreSelect,
  admin: {
    select: { id: true, username: true, fullName: true, lastLogin: true },
  },
  resellerStations: {
    where: { deletedAt: null },
    select: {
      station: { select: stationBriefSelect },
    },
    orderBy: { station: { name: 'asc' as const } },
  },
  planEntitlements: {
    where: { isEnabled: true },
    select: {
      plan: { select: planBriefSelect },
    },
    orderBy: { plan: { name: 'asc' as const } },
  },
} satisfies Prisma.ResellerSelect;

type ResellerListRow = Prisma.ResellerGetPayload<{ select: typeof listPartnerSelect }>;

type PlanEntitlementInput = { planId: string; isEnabled: boolean };

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

async function resolveOrgFromRequest(
  prisma: PrismaClient,
  req: AuthenticatedRequest
): Promise<string> {
  const adminId = req.userId!;
  const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
  const resolved = await resolveOrgIdForAdmin(
    prisma,
    adminId,
    req.user!,
    requestedOrgId || undefined
  );
  if ('requiresSelection' in resolved) {
    throw Object.assign(new Error('Select an organization to manage partners.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

type PartnerDetailCounts = {
  resellerStations: number;
  planEntitlements: number;
  credentials: number;
  sales: number;
};

function serializePortalAccount(
  admin:
    | { username: string; fullName: string | null; lastLogin?: Date | null }
    | null
    | undefined
) {
  if (!admin) return null;
  return {
    username: admin.username,
    fullName: admin.fullName,
    lastLogin: admin.lastLogin ? admin.lastLogin.toISOString() : null,
  };
}

function serializePartnerBase(
  row: {
    id: string;
    orgId: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    status: string;
    adminId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  admin:
    | { username: string; fullName: string | null; lastLogin?: Date | null }
    | null
    | undefined,
  counts: {
    stationCount: number;
    enabledPlanCount: number;
    credentialCount: number;
    salesCount: number;
  },
) {
  return {
    id: row.id,
    orgId: row.orgId,
    code: row.code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status,
    hasPortalAccount: Boolean(row.adminId),
    portalAccount: serializePortalAccount(admin ?? null),
    stationCount: counts.stationCount,
    enabledPlanCount: counts.enabledPlanCount,
    credentialCount: counts.credentialCount,
    salesCount: counts.salesCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializePartnerListRow(row: ResellerListRow, salesCount: number) {
  const stations = row.resellerStations.map((rs) => rs.station);
  const sellablePlans = row.planEntitlements.map((pe) => pe.plan);

  return {
    ...serializePartnerBase(row, row.admin, {
      stationCount: stations.length,
      enabledPlanCount: sellablePlans.length,
      // List does not load credential totals (detail does).
      credentialCount: 0,
      salesCount,
    }),
    stations,
    sellablePlans,
  };
}

async function loadSalesCountsByReseller(
  prisma: PrismaClient,
  orgId: string,
  resellerIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (resellerIds.length === 0) return map;

  const grouped = await prisma.saleOrder.groupBy({
    by: ['resellerId'],
    where: {
      orgId,
      resellerId: { in: resellerIds },
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    if (row.resellerId) {
      map.set(row.resellerId, row._count._all);
    }
  }
  return map;
}

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query'],
  allowedStationIds: string[] | null = null
): Prisma.ResellerWhereInput {
  const where: Prisma.ResellerWhereInput = { orgId, deletedAt: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  if (status && (USER_STATUSES as readonly string[]).includes(status)) {
    where.status = status as UserStatus;
  }

  if (stationId) {
    if (allowedStationIds && !allowedStationIds.includes(stationId)) {
      where.id = { in: [] };
    } else {
      where.resellerStations = {
        some: { stationId, deletedAt: null },
      };
    }
  } else if (allowedStationIds) {
    where.resellerStations = {
      some: { stationId: { in: allowedStationIds }, deletedAt: null },
    };
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { admin: { username: { contains: search, mode: 'insensitive' } } },
      { admin: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function validateStationIds(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  allowedStationIds: string[] | null = null
): Promise<string | null> {
  if (stationIds.length === 0) return null;
  const unique = [...new Set(stationIds)];
  if (allowedStationIds && unique.some((id) => !allowedStationIds.includes(id))) {
    return 'One or more selected sites are not on your allow-list.';
  }
  const count = await prisma.wifiStation.count({
    where: { orgId, deletedAt: null, id: { in: unique } },
  });
  if (count !== unique.length) {
    return 'One or more selected sites are invalid or belong to another tenant.';
  }
  return null;
}

function mergeStationIdsForAllowList(
  submittedIds: string[],
  existingIds: string[],
  allowedStationIds: string[] | null
): string[] {
  if (!allowedStationIds) return [...new Set(submittedIds)];
  const preserved = existingIds.filter((id) => !allowedStationIds.includes(id));
  const scoped = submittedIds.filter((id) => allowedStationIds.includes(id));
  return [...new Set([...preserved, ...scoped])];
}

async function validatePlanEntitlements(
  prisma: PrismaClient,
  orgId: string,
  entitlements: PlanEntitlementInput[]
): Promise<string | null> {
  if (entitlements.length === 0) return null;
  const planIds = [...new Set(entitlements.map((e) => e.planId))];
  const count = await prisma.plan.count({
    where: { orgId, deletedAt: null, id: { in: planIds } },
  });
  if (count !== planIds.length) {
    return 'One or more selected plans are invalid or belong to another tenant.';
  }
  return null;
}

async function syncResellerStations(
  tx: Prisma.TransactionClient,
  orgId: string,
  resellerId: string,
  stationIds: string[],
  assignedByAdminId: string
): Promise<void> {
  const uniqueIds = [...new Set(stationIds)];

  const existing = await tx.resellerStation.findMany({
    where: { resellerId },
    select: { id: true, stationId: true, deletedAt: true },
  });

  const activeByStation = new Map(
    existing.filter((row) => !row.deletedAt).map((row) => [row.stationId, row])
  );
  const allByStation = new Map(existing.map((row) => [row.stationId, row]));
  const targetSet = new Set(uniqueIds);

  for (const row of existing) {
    if (!row.deletedAt && !targetSet.has(row.stationId)) {
      await tx.resellerStation.update({
        where: { id: row.id },
        data: { deletedAt: new Date() },
      });
    }
  }

  for (const stationId of uniqueIds) {
    const active = activeByStation.get(stationId);
    if (active) continue;

    const any = allByStation.get(stationId);
    if (any) {
      await tx.resellerStation.update({
        where: { id: any.id },
        data: { deletedAt: null, assignedByAdminId },
      });
    } else {
      await tx.resellerStation.create({
        data: { orgId, resellerId, stationId, assignedByAdminId },
      });
    }
  }

  await tx.reseller.update({
    where: { id: resellerId },
    data: { stationIds: uniqueIds },
  });
}

async function syncPlanEntitlements(
  tx: Prisma.TransactionClient,
  orgId: string,
  resellerId: string,
  entitlements: PlanEntitlementInput[],
  replaceAll: boolean
): Promise<void> {
  const submittedPlanIds = new Set(entitlements.map((e) => e.planId));

  for (const ent of entitlements) {
    await tx.resellerPlanEntitlement.upsert({
      where: { resellerId_planId: { resellerId, planId: ent.planId } },
      create: { orgId, resellerId, planId: ent.planId, isEnabled: ent.isEnabled },
      update: { isEnabled: ent.isEnabled },
    });
  }

  if (replaceAll) {
    await tx.resellerPlanEntitlement.deleteMany({
      where: {
        resellerId,
        planId: { notIn: [...submittedPlanIds] },
      },
    });
  }
}

async function loadPartnerDetail(prisma: PrismaClient, orgId: string, id: string) {
  const row = await prisma.reseller.findFirst({
    where: { id, orgId, deletedAt: null },
    select: {
      ...partnerCoreSelect,
      _count: { select: partnerDetailCountSelect },
      admin: {
        select: { id: true, username: true, fullName: true, lastLogin: true },
      },
      resellerStations: {
        where: { deletedAt: null },
        select: {
          id: true,
          stationId: true,
          createdAt: true,
          station: { select: stationBriefSelect },
        },
        orderBy: { station: { name: 'asc' } },
      },
      planEntitlements: {
        select: {
          id: true,
          planId: true,
          isEnabled: true,
          plan: { select: planBriefSelect },
        },
        orderBy: { plan: { name: 'asc' } },
      },
    },
  });

  if (!row) return null;

  const { resellerStations, planEntitlements, admin, _count, ...base } = row;
  const sellablePlans = planEntitlements.filter((pe) => pe.isEnabled).map((pe) => pe.plan);
  const counts: PartnerDetailCounts = _count;

  return {
    ...serializePartnerBase(base, admin, {
      stationCount: counts.resellerStations,
      enabledPlanCount: counts.planEntitlements,
      credentialCount: counts.credentials,
      salesCount: counts.sales,
    }),
    stations: resellerStations.map((rs) => ({
      mappingId: rs.id,
      ...rs.station,
      assignedAt: rs.createdAt.toISOString(),
    })),
    sellablePlans,
    planEntitlements: planEntitlements.map((pe) => ({
      id: pe.id,
      planId: pe.planId,
      isEnabled: pe.isEnabled,
      plan: pe.plan,
    })),
    stationIds: resellerStations.map((rs) => rs.stationId),
  };
}

/** menus.wifi.commerce.partners.directory @route /wifi/commerce/partners */
export class CommercePartnersController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        if (orgIdParam) {
          orgId = orgIdParam;
        } else {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const allowedStationIds = orgId
          ? await resolveAllowedStationIds(this.prisma, adminId, orgId, req.user!)
          : null;
        const [memberships, stations, plans, existingResellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId
            ? this.prisma.wifiStation.findMany({
                where: { orgId, deletedAt: null, ...stationPkScope(allowedStationIds) },
                select: stationBriefSelect,
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.plan.findMany({
                where: { orgId, deletedAt: null },
                select: planBriefSelect,
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.reseller.findMany({
                where: { orgId, deletedAt: null },
                select: { code: true },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            stations,
            plans,
            existingCodes: existingResellers.map((row) => row.code),
          },
        });
      }

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ORG_REQUIRED';
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, status, { code, message });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const detail = await loadPartnerDetail(this.prisma, orgId, id);
        if (!detail) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Partner not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: detail });
      }

      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgId,
        req.user!
      );
      const where = buildListWhere(orgId, req.query, allowedStationIds);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, activeCount, suspendedCount, disabledCount, memberships] =
        await Promise.all([
          this.prisma.reseller.findMany({
            where,
            select: listPartnerSelect,
            orderBy: [{ status: 'asc' }, { name: 'asc' }],
            skip,
            take,
          }),
          this.prisma.reseller.count({ where }),
          this.prisma.reseller.count({
            where: { orgId, deletedAt: null, status: 'ACTIVE' },
          }),
          this.prisma.reseller.count({
            where: { orgId, deletedAt: null, status: 'SUSPENDED' },
          }),
          this.prisma.reseller.count({
            where: { orgId, deletedAt: null, status: 'DISABLED' },
          }),
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        ]);

      const salesByReseller = await loadSalesCountsByReseller(
        this.prisma,
        orgId,
        rows.map((row) => row.id),
      );

      responseSuccess(res, {
        message: 'Success',
        data: rows.map((row) =>
          serializePartnerListRow(row, salesByReseller.get(row.id) ?? 0),
        ),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
          suspendedCount,
          disabledCount,
          memberships,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');
      const adminId = req.userId!;

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const { error, value } = (isUpdate ? CommercePartnersUpdateSchema : CommercePartnersCreateSchema).validate(
        req.body,
        { abortEarly: false, allowUnknown: false }
      );

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgId,
        req.user!
      );

      if (isUpdate) {
        const existing = await this.prisma.reseller.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: { id: true, code: true },
        });

        if (!existing) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Partner not found.' });
        }

        if (value.code && value.code !== existing.code) {
          const duplicate = await this.prisma.reseller.findFirst({
            where: { orgId, code: value.code, deletedAt: null, id: { not: existing.id } },
            select: { id: true },
          });
          if (duplicate) {
            return responseError(res, 409, {
              code: 'CODE_EXISTS',
              message: orgScopedCodeTakenMessage('Partner code', value.code),
            });
          }
        }

        if (value.stationIds !== undefined) {
          const existingMappings = await this.prisma.resellerStation.findMany({
            where: { resellerId: existing.id, deletedAt: null },
            select: { stationId: true },
          });
          value.stationIds = mergeStationIdsForAllowList(
            value.stationIds,
            existingMappings.map((row) => row.stationId),
            allowedStationIds
          );
          const stationError = await validateStationIds(
            this.prisma,
            orgId,
            value.stationIds.filter((id) => !allowedStationIds || allowedStationIds.includes(id)),
            allowedStationIds
          );
          if (stationError) {
            return responseError(res, 400, { code: 'VALIDATION_ERROR', message: stationError });
          }
        }

        if (value.planEntitlements !== undefined) {
          const planError = await validatePlanEntitlements(
            this.prisma,
            orgId,
            value.planEntitlements
          );
          if (planError) {
            return responseError(res, 400, { code: 'VALIDATION_ERROR', message: planError });
          }
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.reseller.update({
            where: { id: existing.id },
            data: {
              ...(value.code !== undefined ? { code: value.code } : {}),
              ...(value.name !== undefined ? { name: value.name } : {}),
              ...(value.phone !== undefined ? { phone: value.phone || null } : {}),
              ...(value.email !== undefined ? { email: value.email || null } : {}),
              ...(value.address !== undefined ? { address: value.address || null } : {}),
              ...(value.status !== undefined ? { status: value.status } : {}),
            },
          });

          if (value.stationIds !== undefined) {
            await syncResellerStations(tx, orgId, existing.id, value.stationIds, adminId);
          }

          if (value.planEntitlements !== undefined) {
            await syncPlanEntitlements(tx, orgId, existing.id, value.planEntitlements, true);
          }
        });

        const detail = await loadPartnerDetail(this.prisma, orgId, existing.id);
        return responseSuccess(res, {
          message: 'Partner updated',
          data: detail,
        });
      }

      const stationIds: string[] = value.stationIds ?? [];
      const planEntitlements: PlanEntitlementInput[] = value.planEntitlements ?? [];

      const stationError = await validateStationIds(
        this.prisma,
        orgId,
        stationIds,
        allowedStationIds
      );
      if (stationError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: stationError });
      }

      const planError = await validatePlanEntitlements(this.prisma, orgId, planEntitlements);
      if (planError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: planError });
      }

      const duplicate = await this.prisma.reseller.findFirst({
        where: { orgId, code: value.code, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'CODE_EXISTS',
          message: orgScopedCodeTakenMessage('Partner code', value.code),
        });
      }

      const usernameTaken = await this.prisma.admin.findFirst({
        where: { username: String(value.loginUsername).trim(), deletedAt: null },
        select: { id: true },
      });
      if (usernameTaken) {
        return responseError(res, 409, {
          code: 'USERNAME_EXISTS',
          message: consoleUsernameTakenMessage(String(value.loginUsername).trim()),
        });
      }

      try {
        const createdId = await this.prisma.$transaction(async (tx) => {
          const created = await tx.reseller.create({
            data: {
              orgId,
              code: value.code,
              name: value.name,
              phone: value.phone || null,
              email: value.email || null,
              address: value.address || null,
              status: value.status ?? 'ACTIVE',
              stationIds: [],
            },
            select: { id: true },
          });

          if (stationIds.length > 0) {
            await syncResellerStations(tx, orgId, created.id, stationIds, adminId);
          }

          if (planEntitlements.length > 0) {
            await syncPlanEntitlements(tx, orgId, created.id, planEntitlements, false);
          }

          await provisionPartnerPortalAccount(tx, {
            orgId,
            resellerId: created.id,
            actorAdminId: adminId,
            input: {
              username: value.loginUsername as string,
              password: value.loginPassword as string,
              fullName: value.name as string,
              email: value.email as string | null | undefined,
              phoneNumber: value.phone as string | null | undefined,
            },
          });

          return created.id;
        });

        const detail = await loadPartnerDetail(this.prisma, orgId, createdId);
        return responseSuccess(res, {
          status: 201,
          message: 'Partner and login account created',
          data: detail,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 500;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'PARTNER_CREATE_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to create partner.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const existing = await this.prisma.reseller.findFirst({
        where: { id, orgId, deletedAt: null },
        select: {
          id: true,
          _count: { select: { credentials: true, sales: true } },
        },
      });

      if (!existing) {
        return responseError(res, 404, { code: 'NOT_FOUND', message: 'Partner not found.' });
      }

      if (existing._count.credentials > 0 || existing._count.sales > 0) {
        return responseError(res, 409, {
          code: 'PARTNER_IN_USE',
          message:
            'This partner has issued credentials or sales. Set status to DISABLED instead of deleting.',
        });
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.resellerStation.updateMany({
          where: { resellerId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        await tx.reseller.update({
          where: { id },
          data: { deletedAt: new Date(), status: 'DISABLED', stationIds: [] },
        });
      });

      responseSuccess(res, { message: 'Partner removed', data: { id } });
    }),
  ];

  public resetPassword = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const id = req.params?.id as string;
      const actorAdminId = req.userId!;

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 400, {
          code: e.code ?? 'ORG_REQUIRED',
          message: e.message ?? 'Select an organization to manage partners.',
        });
      }

      const { error, value } = CommercePartnersResetPasswordSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const existing = await this.prisma.reseller.findFirst({
        where: { id, orgId, deletedAt: null },
        select: { id: true, adminId: true, admin: { select: { id: true, username: true } } },
      });

      if (!existing) {
        return responseError(res, 404, { code: 'NOT_FOUND', message: 'Partner not found.' });
      }

      if (!existing.adminId || !existing.admin) {
        return responseError(res, 400, {
          code: 'NO_PORTAL_ACCOUNT',
          message: 'This partner has no login account to reset.',
        });
      }

      const hashedPassword = await hashPassword(value.password as string);
      await this.prisma.admin.update({
        where: { id: existing.adminId },
        data: { password: hashedPassword, updatedBy: actorAdminId },
      });

      responseSuccess(res, {
        message: 'Password updated',
        data: { id: existing.id, username: existing.admin.username },
      });
    }),
  ];
}
