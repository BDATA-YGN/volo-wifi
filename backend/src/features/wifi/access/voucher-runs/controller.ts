import crypto from 'crypto';
import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { voucherBatchTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { AccessVoucherRunsCreateSchema, AccessVoucherRunsUpdateSchema } from './schema';
import {
  resolveAllowedStationIds,
  stationPkScope,
} from '@/features/wifi/shared/resolve-station-scope';

const batchSelect = {
  id: true,
  orgId: true,
  batchNo: true,
  planId: true,
  quantity: true,
  remainingQuantity: true,
  prefix: true,
  note: true,
  stationId: true,
  resellerId: true,
  createdByAdminId: true,
  createdAt: true,
  updatedAt: true,
  plan: {
    select: { id: true, code: true, name: true, quotaType: true, isActive: true },
  },
  station: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      township: true,
      stationSizeId: true,
      stationSize: { select: { id: true, code: true, name: true } },
    },
  },
  createdByAdmin: {
    select: { id: true, fullName: true, username: true, email: true },
  },
} satisfies Prisma.VoucherBatchSelect;

type BatchRow = Prisma.VoucherBatchGetPayload<{ select: typeof batchSelect }>;
type BatchRowWithCount = BatchRow & { _count?: { credentials: number } };

const batchListSelect = {
  ...batchSelect,
  _count: { select: { credentials: true } },
} satisfies Prisma.VoucherBatchSelect;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function tokenKeyForBatch(batchNo: string, prefix?: string | null): string {
  return (prefix?.trim().toUpperCase() || batchNo).toUpperCase();
}

function generateBatchNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VR-${date}-${rand}`;
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
    throw Object.assign(new Error('Select an organization to manage voucher runs.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

/** List/formOptions scope: developers may browse all orgs when orgId is omitted. */
async function resolveListOrgScope(
  prisma: PrismaClient,
  req: AuthenticatedRequest,
  isDeveloper: boolean
): Promise<{ orgId: string | undefined; canViewAllOrgs: boolean }> {
  const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
  if (requestedOrgId) {
    const orgId = await resolveOrgFromRequest(prisma, req);
    return { orgId, canViewAllOrgs: isDeveloper };
  }
  if (isDeveloper) {
    return { orgId: undefined, canViewAllOrgs: true };
  }
  const orgId = await resolveOrgFromRequest(prisma, req);
  return { orgId, canViewAllOrgs: false };
}

const planOptionSelect = {
  id: true,
  code: true,
  name: true,
  quotaType: true,
  orgId: true,
  org: { select: { id: true, code: true, name: true } },
} satisfies Prisma.PlanSelect;

const stationOptionSelect = {
  id: true,
  code: true,
  name: true,
  township: true,
  stationSizeId: true,
  orgId: true,
  org: { select: { id: true, code: true, name: true } },
  stationSize: { select: { id: true, code: true, name: true } },
} satisfies Prisma.WifiStationSelect;

async function resolveMutateOrgId(
  prisma: PrismaClient,
  req: AuthenticatedRequest,
  isDeveloper: boolean,
  hints: { stationId?: string | null; planId?: string | null; batchId?: string | null } = {}
): Promise<string> {
  try {
    return await resolveOrgFromRequest(prisma, req);
  } catch (err) {
    if (!isDeveloper) throw err;
  }

  if (hints.stationId) {
    const station = await prisma.wifiStation.findFirst({
      where: { id: hints.stationId, deletedAt: null },
      select: { orgId: true },
    });
    if (station?.orgId) return station.orgId;
  }

  if (hints.planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: hints.planId, deletedAt: null },
      select: { orgId: true },
    });
    if (plan?.orgId) return plan.orgId;
  }

  if (hints.batchId) {
    const batch = await prisma.voucherBatch.findFirst({
      where: { id: hints.batchId, deletedAt: null, resellerId: null },
      select: { orgId: true },
    });
    if (batch?.orgId) return batch.orgId;
  }

  throw Object.assign(new Error('Select an organization to manage voucher runs.'), {
    status: 400,
    code: 'ORG_REQUIRED',
  });
}

function serializeBatch(row: BatchRowWithCount) {
  const { _count, ...base } = row;
  const issued = base.quantity;
  const remaining = base.remainingQuantity;
  const issuedTokenCount = _count?.credentials ?? 0;
  return {
    ...base,
    issued,
    redeemed: Math.max(0, issued - remaining),
    issuedTokenCount,
    canCancel: issuedTokenCount === 0 && remaining > 0,
    tokenKey: tokenKeyForBatch(base.batchNo, base.prefix),
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),
  };
}

function credentialWhereForBatch(batchId: string): Prisma.CredentialWhereInput {
  return {
    voucherBatchId: batchId,
    deletedAt: null,
    type: 'VOUCHER_TOKEN',
  };
}

function parseDateBoundary(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Accept YYYY-MM-DD or full ISO.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : trimmed;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildListWhere(
  orgId: string | undefined,
  query: AuthenticatedRequest['query'],
  allowedStationIds: string[] | null = null
): Prisma.VoucherBatchWhereInput {
  const where: Prisma.VoucherBatchWhereInput = {
    deletedAt: null,
    resellerId: null,
    ...(orgId ? { orgId } : {}),
  };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';
  const township = typeof query.township === 'string' ? query.township.trim() : '';
  const stationSizeId =
    typeof query.stationSizeId === 'string' ? query.stationSizeId.trim() : '';
  const dateFromRaw = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateToRaw = typeof query.dateTo === 'string' ? query.dateTo : '';
  const hasBalanceRaw =
    typeof query.hasBalance === 'string' ? query.hasBalance.trim().toLowerCase() : '';

  if (planId) where.planId = planId;
  if (stationId) {
    where.stationId =
      allowedStationIds && !allowedStationIds.includes(stationId)
        ? { in: [] }
        : stationId;
  } else if (allowedStationIds) {
    where.stationId = { in: allowedStationIds };
  }

  const stationFilter: Prisma.WifiStationWhereInput = {};
  if (township) {
    stationFilter.township = { equals: township, mode: 'insensitive' };
  }
  if (stationSizeId) {
    stationFilter.stationSizeId = stationSizeId;
  }
  if (Object.keys(stationFilter).length > 0) {
    where.station = stationFilter;
  }

  const dateFrom = parseDateBoundary(dateFromRaw, false);
  const dateTo = parseDateBoundary(dateToRaw, true);
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (hasBalanceRaw === 'true' || hasBalanceRaw === '1' || hasBalanceRaw === 'yes') {
    where.remainingQuantity = { gt: 0 };
  }

  if (search) {
    where.OR = [
      { batchNo: { contains: search, mode: 'insensitive' } },
      { prefix: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
      { station: { code: { contains: search, mode: 'insensitive' } } },
      { station: { township: { contains: search, mode: 'insensitive' } } },
      { createdByAdmin: { fullName: { contains: search, mode: 'insensitive' } } },
      { createdByAdmin: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/** menus.wifi.access.voucher-runs @route /wifi/access/voucher-runs */
export class AccessVoucherRunsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        const canViewAllOrgs = isDeveloper;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        if (orgIdParam) {
          orgId = orgIdParam;
        } else if (!isDeveloper) {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const loadAllCatalog = canViewAllOrgs && !orgId;
        const allowedStationIds = orgId
          ? await resolveAllowedStationIds(this.prisma, adminId, orgId, req.user!)
          : null;

        const [memberships, plans, stations, stationSizes] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId || loadAllCatalog
            ? this.prisma.plan.findMany({
                where: {
                  deletedAt: null,
                  isActive: true,
                  ...(orgId ? { orgId } : {}),
                },
                select: planOptionSelect,
                orderBy: [{ org: { code: 'asc' } }, { name: 'asc' }],
              })
            : Promise.resolve([]),
          orgId || loadAllCatalog
            ? this.prisma.wifiStation.findMany({
                where: {
                  deletedAt: null,
                  status: 'ACTIVE',
                  ...(orgId ? { orgId } : {}),
                  ...stationPkScope(allowedStationIds),
                },
                select: stationOptionSelect,
                orderBy: [{ org: { code: 'asc' } }, { name: 'asc' }],
              })
            : Promise.resolve([]),
          this.prisma.stationSize.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            plans,
            stations,
            stationSizes,
            canViewAllOrgs,
            canSwitchOrg: isDeveloper || memberships.length > 1,
            requiresOrgSelection: !canViewAllOrgs && !orgId && memberships.length > 1,
            scopedOrgId: orgId ?? null,
          },
        });
      }

      if (req.query.siteBalance === 'true') {
        const stationId =
          typeof req.query.stationId === 'string' ? req.query.stationId.trim() : '';
        if (!stationId) {
          return responseError(res, 400, {
            code: 'STATION_REQUIRED',
            message: 'Select a site to view remaining balance by plan.',
          });
        }

        const station = await this.prisma.wifiStation.findFirst({
          where: { id: stationId, deletedAt: null },
          select: { id: true, code: true, name: true, orgId: true },
        });
        if (!station) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Site not found.',
          });
        }

        if (!isDeveloper) {
          let orgId: string;
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch (err: unknown) {
            const message =
              err instanceof Error ? err.message : 'Organization context is required.';
            return responseError(res, 400, { code: 'ORG_REQUIRED', message });
          }
          if (station.orgId !== orgId) {
            return responseError(res, 403, {
              code: 'FORBIDDEN_ORG',
              message: 'You do not have access to this site.',
            });
          }
        }

        const allowedStationIds = await resolveAllowedStationIds(
          this.prisma,
          adminId,
          station.orgId,
          req.user!
        );
        if (allowedStationIds && !allowedStationIds.includes(station.id)) {
          return responseError(res, 403, {
            code: 'SITE_NOT_ALLOWED',
            message: 'This site is not on your allow-list.',
          });
        }

        const [plans, batches] = await Promise.all([
          this.prisma.plan.findMany({
            where: { orgId: station.orgId, deletedAt: null, isActive: true },
            select: { id: true, code: true, name: true },
            orderBy: [{ name: 'asc' }, { code: 'asc' }],
          }),
          this.prisma.voucherBatch.findMany({
            where: {
              orgId: station.orgId,
              deletedAt: null,
              resellerId: null,
              remainingQuantity: { gt: 0 },
              OR: [{ stationId: null }, { stationId: station.id }],
            },
            select: { planId: true, stationId: true, remainingQuantity: true },
          }),
        ]);

        const byPlan = new Map<
          string,
          { siteRemaining: number; sharedRemaining: number; runCount: number }
        >();
        for (const batch of batches) {
          const bucket = byPlan.get(batch.planId) ?? {
            siteRemaining: 0,
            sharedRemaining: 0,
            runCount: 0,
          };
          if (batch.stationId === station.id) bucket.siteRemaining += batch.remainingQuantity;
          else bucket.sharedRemaining += batch.remainingQuantity;
          bucket.runCount += 1;
          byPlan.set(batch.planId, bucket);
        }

        return responseSuccess(res, {
          message: 'Success',
          data: {
            station: { id: station.id, code: station.code, name: station.name },
            plans: plans.map((plan) => {
              const bucket = byPlan.get(plan.id) ?? {
                siteRemaining: 0,
                sharedRemaining: 0,
                runCount: 0,
              };
              return {
                planId: plan.id,
                code: plan.code,
                name: plan.name,
                remaining: bucket.siteRemaining + bucket.sharedRemaining,
                siteRemaining: bucket.siteRemaining,
                sharedRemaining: bucket.sharedRemaining,
                runCount: bucket.runCount,
              };
            }),
          },
        });
      }

      let listScope: { orgId: string | undefined; canViewAllOrgs: boolean };
      try {
        listScope = await resolveListOrgScope(this.prisma, req, isDeveloper);
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

      const { orgId, canViewAllOrgs } = listScope;
      const memberships = await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper);

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const batch = await this.prisma.voucherBatch.findFirst({
          where: {
            id,
            deletedAt: null,
            resellerId: null,
            ...(orgId ? { orgId } : {}),
          },
          select: batchListSelect,
        });

        if (!batch) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Voucher run not found.',
          });
        }

        const credWhere = credentialWhereForBatch(batch.id);

        const statusGroups = await this.prisma.credential.groupBy({
          by: ['status'],
          where: credWhere,
          _count: { _all: true },
        });

        const credentialStats = Object.fromEntries(
          statusGroups.map((g) => [g.status, g._count._all])
        );

        return responseSuccess(res, {
          message: 'Success',
          data: {
            ...serializeBatch(batch),
            credentialStats,
          },
          meta: {
            canViewAllOrgs,
            canSwitchOrg: isDeveloper || memberships.length > 1,
            memberships,
            scopedOrgId: orgId ?? null,
          },
        });
      }

      const allowedStationIds = orgId
        ? await resolveAllowedStationIds(this.prisma, adminId, orgId, req.user!)
        : null;
      const where = buildListWhere(orgId, req.query, allowedStationIds);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, totals] = await Promise.all([
        this.prisma.voucherBatch.findMany({
          where,
          select: batchListSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.voucherBatch.count({ where }),
        this.prisma.voucherBatch.aggregate({
          where,
          _sum: { quantity: true, remainingQuantity: true },
          _count: { _all: true },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeBatch),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          runCount: totals._count._all,
          totalVouchers: totals._sum.quantity ?? 0,
          remainingVouchers: totals._sum.remainingQuantity ?? 0,
          memberships,
          canViewAllOrgs,
          canSwitchOrg: isDeveloper || memberships.length > 1,
          requiresOrgSelection: !canViewAllOrgs && !orgId && memberships.length > 1,
          scopedOrgId: orgId ?? null,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (isUpdate) {
        const { error, value } = AccessVoucherRunsUpdateSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        let orgId: string;
        try {
          orgId = await resolveMutateOrgId(this.prisma, req, isDeveloper, {
            batchId: recordId,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Organization context is required.';
          return responseError(res, 400, { code: 'ORG_REQUIRED', message });
        }

        const existing = await this.prisma.voucherBatch.findFirst({
          where: { id: recordId!, orgId, deletedAt: null, resellerId: null },
          select: batchSelect,
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Voucher run not found.',
          });
        }

        const updated = await this.prisma.voucherBatch.update({
          where: { id: recordId! },
          data: { note: value.note || null },
          select: batchSelect,
        });

        return responseSuccess(res, {
          message: 'Voucher run updated',
          data: serializeBatch(updated),
        });
      }

      const { error, value } = AccessVoucherRunsCreateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let orgId: string;
      try {
        orgId = await resolveMutateOrgId(this.prisma, req, isDeveloper, {
          stationId: value.stationId,
          planId: value.planId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const plan = await this.prisma.plan.findFirst({
        where: { id: value.planId, orgId, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (!plan) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Selected service plan is invalid or inactive.',
        });
      }

      const station = await this.prisma.wifiStation.findFirst({
        where: { id: value.stationId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!station) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Selected site is invalid for this organization.',
        });
      }

      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgId,
        req.user!
      );
      if (allowedStationIds && !allowedStationIds.includes(station.id)) {
        return responseError(res, 403, {
          code: 'SITE_NOT_ALLOWED',
          message: 'This site is not on your allow-list.',
        });
      }

      const batchNo = value.batchNo?.trim().toUpperCase() || generateBatchNo();
      const prefix = value.prefix?.trim().toUpperCase() || null;

      const duplicate = await this.prisma.voucherBatch.findFirst({
        where: { orgId, batchNo, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'BATCH_EXISTS',
          message: voucherBatchTakenMessage(batchNo),
        });
      }

      const quantity = value.quantity as number;

      const created = await this.prisma.voucherBatch.create({
        data: {
          orgId,
          batchNo,
          planId: value.planId,
          quantity,
          remainingQuantity: quantity,
          prefix,
          note: value.note || null,
          stationId: value.stationId,
          resellerId: null,
          createdByAdminId: adminId,
        },
        select: batchSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Voucher run created',
        data: serializeBatch(created),
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const isDeveloper = isDeveloperAdmin(req.user!);
      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      let orgId: string;
      try {
        orgId = await resolveMutateOrgId(this.prisma, req, isDeveloper, { batchId: id });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const batch = await this.prisma.voucherBatch.findFirst({
        where: { id, orgId, deletedAt: null, resellerId: null },
        select: { id: true, remainingQuantity: true },
      });

      if (!batch) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Voucher run not found.',
        });
      }

      const issuedTokenCount = await this.prisma.credential.count({
        where: { voucherBatchId: id, deletedAt: null },
      });

      if (issuedTokenCount > 0) {
        return responseError(res, 409, {
          code: 'RUN_HAS_ISSUED_TOKENS',
          message:
            'Cannot cancel this run — voucher codes have already been sold from it.',
        });
      }

      if (batch.remainingQuantity <= 0) {
        return responseError(res, 409, {
          code: 'RUN_NOT_CANCELLABLE',
          message: 'This voucher run has no remaining capacity to cancel.',
        });
      }

      const now = new Date();

      await this.prisma.voucherBatch.update({
        where: { id },
        data: { deletedAt: now, remainingQuantity: 0 },
      });

      responseSuccess(res, { message: 'Voucher run cancelled', data: { id } });
    }),
  ];
}
