import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { commissionPayoutPeriodOverlapMessage } from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import {
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  PAYOUT_STATUSES,
  type PayoutStatus,
} from './constants';
import {
  calculatePartnerCommission,
  findOverlappingPayout,
} from './calc-commission';
import {
  CommerceCommissionsPayoutsCreateSchema,
  CommerceCommissionsPayoutsPreviewSchema,
  CommerceCommissionsPayoutsUpdateSchema,
} from './schema';

const payoutSelect = {
  id: true,
  orgId: true,
  resellerId: true,
  periodFrom: true,
  periodTo: true,
  amount: true,
  status: true,
  paidAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  reseller: {
    select: { id: true, code: true, name: true, status: true },
  },
} satisfies Prisma.CommissionPayoutSelect;

type PayoutRow = Prisma.CommissionPayoutGetPayload<{ select: typeof payoutSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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
    throw Object.assign(new Error('Select an organization to manage commission payouts.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function formatPeriodLabel(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function serializePayout(row: PayoutRow) {
  return {
    id: row.id,
    orgId: row.orgId,
    resellerId: row.resellerId,
    periodFrom: row.periodFrom.toISOString(),
    periodTo: row.periodTo.toISOString(),
    periodLabel: formatPeriodLabel(row.periodFrom, row.periodTo),
    amount: decimalToNumber(row.amount),
    status: row.status,
    paidAt: row.paidAt?.toISOString() ?? null,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reseller: row.reseller,
  };
}

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.CommissionPayoutWhereInput {
  const where: Prisma.CommissionPayoutWhereInput = { orgId };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const resellerId = typeof query.resellerId === 'string' ? query.resellerId.trim() : '';
  const periodFrom = parseDateParam(query.periodFrom);
  const periodTo = parseDateParam(query.periodTo);

  if (status && (PAYOUT_STATUSES as readonly string[]).includes(status)) {
    where.status = status as PayoutStatus;
  }
  if (resellerId) where.resellerId = resellerId;
  if (periodFrom) {
    where.periodTo = { ...(where.periodTo as object), gte: startOfDay(periodFrom) };
  }
  if (periodTo) {
    where.periodFrom = { ...(where.periodFrom as object), lte: endOfDay(periodTo) };
  }

  if (search) {
    where.OR = [
      { reseller: { code: { contains: search, mode: 'insensitive' } } },
      { reseller: { name: { contains: search, mode: 'insensitive' } } },
      { note: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** menus.wifi.commerce.commissions.payouts @route /wifi/commerce/commissions/payouts */
export class CommerceCommissionsPayoutsController {
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

        const [memberships, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId
            ? this.prisma.reseller.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        const org = orgId
          ? await this.prisma.org.findUnique({
              where: { id: orgId },
              select: { currency: true },
            })
          : null;

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers, currency: org?.currency ?? 'MMK' },
        });
      }

      if (req.query.preview === 'true') {
        let orgId: string;
        try {
          orgId = await resolveOrgFromRequest(this.prisma, req);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Organization context is required.';
          return responseError(res, 400, { code: 'ORG_REQUIRED', message });
        }

        const previewInput = {
          resellerId:
            typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : '',
          periodFrom: req.query.periodFrom,
          periodTo: req.query.periodTo,
        };

        const { error, value } = CommerceCommissionsPayoutsPreviewSchema.validate(
          previewInput,
          { abortEarly: false }
        );

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const reseller = await this.prisma.reseller.findFirst({
          where: { id: value.resellerId, orgId, deletedAt: null },
          select: { id: true },
        });
        if (!reseller) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: 'Selected partner is invalid for this tenant.',
          });
        }

        const periodFrom = startOfDay(new Date(value.periodFrom));
        const periodTo = endOfDay(new Date(value.periodTo));

        if (periodFrom > periodTo) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: 'Period end must be on or after period start.',
          });
        }

        const [preview, hasOverlap] = await Promise.all([
          calculatePartnerCommission(
            this.prisma,
            orgId,
            value.resellerId,
            periodFrom,
            periodTo
          ),
          findOverlappingPayout(this.prisma, orgId, value.resellerId, periodFrom, periodTo),
        ]);

        const org = await this.prisma.org.findUnique({
          where: { id: orgId },
          select: { currency: true },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: {
            ...preview,
            currency: org?.currency ?? 'MMK',
            hasOverlap,
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

        const row = await this.prisma.commissionPayout.findFirst({
          where: { id, orgId },
          select: payoutSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Commission payout not found.',
          });
        }

        const serialized = serializePayout(row);
        let breakdown = null;

        if (row.resellerId && row.status !== 'REJECTED') {
          breakdown = await calculatePartnerCommission(
            this.prisma,
            orgId,
            row.resellerId,
            row.periodFrom,
            row.periodTo
          );
        }

        const org = await this.prisma.org.findUnique({
          where: { id: orgId },
          select: { currency: true },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: {
            ...serialized,
            currency: org?.currency ?? 'MMK',
            breakdown,
          },
        });
      }

      const where = buildListWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [
        rows,
        total,
        pendingCount,
        approvedCount,
        paidCount,
        pendingAmount,
        paidAmount,
        memberships,
      ] = await Promise.all([
        this.prisma.commissionPayout.findMany({
          where,
          select: payoutSelect,
          orderBy: [{ createdAt: 'desc' }],
          skip,
          take,
        }),
        this.prisma.commissionPayout.count({ where }),
        this.prisma.commissionPayout.count({ where: { orgId, status: 'PENDING' } }),
        this.prisma.commissionPayout.count({ where: { orgId, status: 'APPROVED' } }),
        this.prisma.commissionPayout.count({ where: { orgId, status: 'PAID' } }),
        this.prisma.commissionPayout.aggregate({
          where: { orgId, status: { in: ['PENDING', 'APPROVED'] } },
          _sum: { amount: true },
        }),
        this.prisma.commissionPayout.aggregate({
          where: { orgId, status: 'PAID' },
          _sum: { amount: true },
        }),
        loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
      ]);

      const org = await this.prisma.org.findUnique({
        where: { id: orgId },
        select: { currency: true },
      });

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializePayout),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          pendingCount,
          approvedCount,
          paidCount,
          outstandingAmount: decimalToNumber(pendingAmount._sum.amount ?? new Prisma.Decimal(0)),
          paidAmount: decimalToNumber(paidAmount._sum.amount ?? new Prisma.Decimal(0)),
          currency: org?.currency ?? 'MMK',
          memberships,
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
        const { error, value } = CommerceCommissionsPayoutsUpdateSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const existing = await this.prisma.commissionPayout.findFirst({
          where: { id: recordId!, orgId },
          select: payoutSelect,
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Commission payout not found.',
          });
        }

        if (value.status && value.status !== existing.status) {
          if ((TERMINAL_STATUSES as string[]).includes(existing.status)) {
            return responseError(res, 400, {
              code: 'INVALID_TRANSITION',
              message: `Cannot change status from ${existing.status}.`,
            });
          }

          const allowed = STATUS_TRANSITIONS[existing.status as PayoutStatus];
          if (!allowed.includes(value.status as PayoutStatus)) {
            return responseError(res, 400, {
              code: 'INVALID_TRANSITION',
              message: `Cannot transition from ${existing.status} to ${value.status}.`,
            });
          }
        }

        const updated = await this.prisma.commissionPayout.update({
          where: { id: existing.id },
          data: {
            ...(value.status !== undefined ? { status: value.status } : {}),
            ...(value.note !== undefined ? { note: value.note || null } : {}),
            ...(value.status === 'PAID'
              ? { paidAt: value.paidAt ? new Date(value.paidAt) : new Date() }
              : {}),
          },
          select: payoutSelect,
        });

        return responseSuccess(res, {
          message: 'Commission payout updated',
          data: serializePayout(updated),
        });
      }

      const { error, value } = CommerceCommissionsPayoutsCreateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const reseller = await this.prisma.reseller.findFirst({
        where: { id: value.resellerId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!reseller) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Selected partner is invalid for this tenant.',
        });
      }

      const periodFrom = startOfDay(new Date(value.periodFrom));
      const periodTo = endOfDay(new Date(value.periodTo));

      const hasOverlap = await findOverlappingPayout(
        this.prisma,
        orgId,
        value.resellerId,
        periodFrom,
        periodTo
      );
      if (hasOverlap) {
        return responseError(res, 409, {
          code: 'PERIOD_OVERLAP',
          message:
            commissionPayoutPeriodOverlapMessage(),
        });
      }

      let amount: number;
      if (value.generate) {
        const preview = await calculatePartnerCommission(
          this.prisma,
          orgId,
          value.resellerId,
          periodFrom,
          periodTo
        );
        amount = preview.commissionAmount;
      } else {
        amount = value.amount!;
      }

      const created = await this.prisma.commissionPayout.create({
        data: {
          orgId,
          resellerId: value.resellerId,
          periodFrom,
          periodTo,
          amount,
          status: 'PENDING',
          note: value.note || null,
        },
        select: payoutSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Commission payout created',
        data: serializePayout(created),
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

      const existing = await this.prisma.commissionPayout.findFirst({
        where: { id, orgId },
        select: { id: true, status: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Commission payout not found.',
        });
      }

      if (!['PENDING', 'REJECTED'].includes(existing.status)) {
        return responseError(res, 400, {
          code: 'CANNOT_DELETE',
          message: 'Only pending or rejected payouts can be deleted.',
        });
      }

      await this.prisma.commissionPayout.delete({ where: { id } });

      responseSuccess(res, { message: 'Commission payout removed', data: { id } });
    }),
  ];
}
