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
import { CREDENTIAL_PREVIEW_LIMIT } from './constants';
import { AccessVoucherRunsCreateSchema, AccessVoucherRunsUpdateSchema } from './schema';

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
  createdAt: true,
  updatedAt: true,
  plan: {
    select: { id: true, code: true, name: true, quotaType: true, isActive: true },
  },
  station: {
    select: { id: true, code: true, name: true, status: true },
  },
} satisfies Prisma.VoucherBatchSelect;

const credentialBriefSelect = {
  id: true,
  token: true,
  status: true,
  createdAt: true,
  soldAt: true,
  activatedAt: true,
  revokedAt: true,
} satisfies Prisma.CredentialSelect;

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

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.VoucherBatchWhereInput {
  const where: Prisma.VoucherBatchWhereInput = { orgId, deletedAt: null, resellerId: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  if (planId) where.planId = planId;
  if (stationId) where.stationId = stationId;

  if (search) {
    where.OR = [
      { batchNo: { contains: search, mode: 'insensitive' } },
      { prefix: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
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

        const [memberships, plans, stations] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId
            ? this.prisma.plan.findMany({
                where: { orgId, deletedAt: null, isActive: true },
                select: { id: true, code: true, name: true, quotaType: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.wifiStation.findMany({
                where: { orgId, deletedAt: null, status: 'ACTIVE' },
                select: { id: true, code: true, name: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, plans, stations },
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

        const batch = await this.prisma.voucherBatch.findFirst({
          where: { id, orgId, deletedAt: null, resellerId: null },
          select: batchListSelect,
        });

        if (!batch) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Voucher run not found.',
          });
        }

        const credWhere = credentialWhereForBatch(batch.id);

        const [statusGroups, credentials, totalCredentials] = await Promise.all([
          this.prisma.credential.groupBy({
            by: ['status'],
            where: credWhere,
            _count: { _all: true },
          }),
          this.prisma.credential.findMany({
            where: credWhere,
            select: credentialBriefSelect,
            orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
            take: CREDENTIAL_PREVIEW_LIMIT,
          }),
          this.prisma.credential.count({ where: credWhere }),
        ]);

        const credentialStats = Object.fromEntries(
          statusGroups.map((g) => [g.status, g._count._all])
        );

        return responseSuccess(res, {
          message: 'Success',
          data: {
            ...serializeBatch(batch),
            credentialStats,
            credentials: credentials.map((c) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
              soldAt: c.soldAt?.toISOString() ?? null,
              activatedAt: c.activatedAt?.toISOString() ?? null,
              revokedAt: c.revokedAt?.toISOString() ?? null,
            })),
            credentialsTotal: totalCredentials,
            credentialsTruncated: totalCredentials > CREDENTIAL_PREVIEW_LIMIT,
          },
        });
      }

      const where = buildListWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, totalVouchers, remainingVouchers, runCount] = await Promise.all([
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
          _sum: { quantity: true },
        }),
        this.prisma.voucherBatch.aggregate({
          where,
          _sum: { remainingQuantity: true },
        }),
        this.prisma.voucherBatch.count({
          where: { orgId, deletedAt: null, resellerId: null },
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
          runCount,
          totalVouchers: totalVouchers._sum.quantity ?? 0,
          remainingVouchers: remainingVouchers._sum.remainingQuantity ?? 0,
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

      if (value.stationId) {
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
          stationId: value.stationId ?? null,
          resellerId: null,
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
