import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { orgScopedCodeTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import {
  PLAN_QUOTA_TYPES,
  PLAN_TIME_USAGE_MODES,
  UNIT_TIME_VALUES,
  type PlanQuotaType,
  type PlanTimeUsageMode,
  type UnitTime,
} from './constants';
import {
  CatalogServicePlansCreateSchema,
  CatalogServicePlansUpdateSchema,
} from './schema';

const planSelect = {
  id: true,
  orgId: true,
  code: true,
  name: true,
  description: true,
  quotaType: true,
  timeAmount: true,
  timeUnit: true,
  dataMb: true,
  validityDays: true,
  maxDevices: true,
  timeUsageMode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      prices: { where: { deletedAt: null, isActive: true } },
      credentials: true,
      voucherBatches: true,
      planAttributes: { where: { deletedAt: null } },
      salesItems: true,
    },
  },
} satisfies Prisma.PlanSelect;

type PlanRow = Prisma.PlanGetPayload<{ select: typeof planSelect }>;

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
    throw Object.assign(new Error('Select an organization to manage service plans.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.PlanWhereInput {
  const where: Prisma.PlanWhereInput = { orgId, deletedAt: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const quotaType = typeof query.quotaType === 'string' ? query.quotaType.trim() : '';
  const isActive = typeof query.isActive === 'string' ? query.isActive.trim() : '';

  if (quotaType && (PLAN_QUOTA_TYPES as readonly string[]).includes(quotaType)) {
    where.quotaType = quotaType as PlanQuotaType;
  }

  if (isActive === 'true') where.isActive = true;
  if (isActive === 'false') where.isActive = false;

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function serializePlan(row: PlanRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizePlanWrite(
  quotaType: PlanQuotaType,
  value: Record<string, unknown>
): Prisma.PlanUncheckedUpdateInput {
  const needsTime = quotaType === 'TIME_ONLY' || quotaType === 'TIME_AND_DATA';
  const needsData = quotaType === 'DATA_ONLY' || quotaType === 'TIME_AND_DATA';

  const data: Prisma.PlanUncheckedUpdateInput = {
    ...(value.code !== undefined ? { code: String(value.code) } : {}),
    ...(value.name !== undefined ? { name: String(value.name) } : {}),
    ...(value.description !== undefined
      ? { description: value.description ? String(value.description) : null }
      : {}),
    ...(value.quotaType !== undefined ? { quotaType } : {}),
    timeAmount: needsTime ? (value.timeAmount as number) : null,
    timeUnit: needsTime ? (value.timeUnit as UnitTime) : null,
    dataMb: needsData ? (value.dataMb as number) : null,
    ...(value.validityDays !== undefined
      ? { validityDays: value.validityDays as number }
      : {}),
    ...(value.maxDevices !== undefined ? { maxDevices: value.maxDevices as number } : {}),
    timeUsageMode:
      needsTime && value.timeUsageMode
        ? (value.timeUsageMode as PlanTimeUsageMode)
        : 'CUMULATIVE_SESSIONS',
    ...(value.isActive !== undefined ? { isActive: value.isActive as boolean } : {}),
  };

  return data;
}

function validateMergedQuota(
  quotaType: PlanQuotaType,
  fields: {
    timeAmount?: number | null;
    timeUnit?: string | null;
    dataMb?: number | null;
  }
): string | null {
  const needsTime = quotaType === 'TIME_ONLY' || quotaType === 'TIME_AND_DATA';
  const needsData = quotaType === 'DATA_ONLY' || quotaType === 'TIME_AND_DATA';

  if (needsTime && (fields.timeAmount == null || !fields.timeUnit)) {
    return 'Time amount and unit are required for time-based plans.';
  }
  if (needsData && fields.dataMb == null) {
    return 'Data quota (MB) is required for data-based plans.';
  }
  return null;
}

/** menus.wifi.catalog.service-plans @route /wifi/catalog/service-plans */
export class CatalogServicePlansController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        const memberships = await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper);
        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            quotaTypes: PLAN_QUOTA_TYPES,
            timeUnits: UNIT_TIME_VALUES,
            timeUsageModes: PLAN_TIME_USAGE_MODES,
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

        const row = await this.prisma.plan.findFirst({
          where: { id, orgId, deletedAt: null },
          select: planSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Service plan not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: serializePlan(row) });
      }

      const where = buildListWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, activeCount, timeOnlyCount, dataOnlyCount, comboCount] =
        await Promise.all([
          this.prisma.plan.findMany({
            where,
            select: planSelect,
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
            skip,
            take,
          }),
          this.prisma.plan.count({ where }),
          this.prisma.plan.count({ where: { orgId, deletedAt: null, isActive: true } }),
          this.prisma.plan.count({
            where: { orgId, deletedAt: null, quotaType: 'TIME_ONLY' },
          }),
          this.prisma.plan.count({
            where: { orgId, deletedAt: null, quotaType: 'DATA_ONLY' },
          }),
          this.prisma.plan.count({
            where: { orgId, deletedAt: null, quotaType: 'TIME_AND_DATA' },
          }),
        ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializePlan),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
          timeOnlyCount,
          dataOnlyCount,
          comboCount,
          memberships: await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const { error, value } = (isUpdate
        ? CatalogServicePlansUpdateSchema
        : CatalogServicePlansCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.plan.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: {
            id: true,
            code: true,
            quotaType: true,
            timeAmount: true,
            timeUnit: true,
            dataMb: true,
            _count: { select: { credentials: true } },
          },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Service plan not found.',
          });
        }

        if (value.code && value.code !== existing.code && existing._count.credentials > 0) {
          return responseError(res, 409, {
            code: 'PLAN_IN_USE',
            message: 'Cannot change plan code while credentials reference it.',
          });
        }

        if (value.code && value.code !== existing.code) {
          const duplicate = await this.prisma.plan.findFirst({
            where: { orgId, code: value.code, deletedAt: null, id: { not: recordId! } },
            select: { id: true },
          });
          if (duplicate) {
            return responseError(res, 409, {
              code: 'CODE_EXISTS',
              message: orgScopedCodeTakenMessage('Plan code', value.code),
            });
          }
        }

        const mergedQuotaType = (value.quotaType ?? existing.quotaType) as PlanQuotaType;
        const quotaError = validateMergedQuota(mergedQuotaType, {
          timeAmount: value.timeAmount !== undefined ? value.timeAmount : existing.timeAmount,
          timeUnit: value.timeUnit !== undefined ? value.timeUnit : existing.timeUnit,
          dataMb: value.dataMb !== undefined ? value.dataMb : existing.dataMb,
        });
        if (quotaError) {
          return responseError(res, 400, { code: 'VALIDATION_ERROR', message: quotaError });
        }

        const writeData = normalizePlanWrite(mergedQuotaType, {
          ...value,
          quotaType: mergedQuotaType,
          timeAmount:
            value.timeAmount !== undefined ? value.timeAmount : existing.timeAmount,
          timeUnit: value.timeUnit !== undefined ? value.timeUnit : existing.timeUnit,
          dataMb: value.dataMb !== undefined ? value.dataMb : existing.dataMb,
        });

        const updated = await this.prisma.plan.update({
          where: { id: recordId! },
          data: writeData,
          select: planSelect,
        });

        return responseSuccess(res, {
          message: 'Service plan updated',
          data: serializePlan(updated),
        });
      }

      const duplicate = await this.prisma.plan.findFirst({
        where: { orgId, code: value.code, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'CODE_EXISTS',
          message: orgScopedCodeTakenMessage('Plan code', value.code),
        });
      }

      const quotaType = value.quotaType as PlanQuotaType;
      const writeData = normalizePlanWrite(quotaType, value);

      const created = await this.prisma.plan.create({
        data: {
          orgId,
          ...(writeData as Prisma.PlanUncheckedCreateInput),
        },
        select: planSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Service plan created',
        data: serializePlan(created),
      });
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
      const existing = await this.prisma.plan.findFirst({
        where: { id, orgId, deletedAt: null },
        select: {
          id: true,
          code: true,
          _count: { select: { credentials: true, salesItems: true } },
        },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Service plan not found.',
        });
      }

      if (existing._count.credentials > 0 || existing._count.salesItems > 0) {
        return responseError(res, 409, {
          code: 'PLAN_IN_USE',
          message:
            'This plan is referenced by credentials or sales. Deactivate it instead of deleting.',
        });
      }

      await this.prisma.plan.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      responseSuccess(res, { message: 'Service plan removed', data: { id } });
    }),
  ];
}
