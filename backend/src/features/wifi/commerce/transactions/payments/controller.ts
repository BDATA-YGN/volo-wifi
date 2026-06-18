import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import {
  loadResellerPicker,
  resolveCommerceScope,
  type CommerceScope,
} from '@/features/wifi/commerce/shared/resolve-commerce-scope';
import { PAYMENT_METHODS, SALE_STATUSES, type PaymentMethod, type SaleStatus } from './constants';

const paymentListSelect = {
  id: true,
  orgId: true,
  orderId: true,
  method: true,
  amount: true,
  refNo: true,
  paidAt: true,
  note: true,
  createdAt: true,
  order: {
    select: {
      id: true,
      orderNo: true,
      status: true,
      total: true,
      currency: true,
      soldAt: true,
      resellerId: true,
      stationId: true,
      reseller: {
        select: { id: true, code: true, name: true, status: true },
      },
      station: {
        select: { id: true, code: true, name: true, status: true },
      },
      _count: { select: { items: true } },
    },
  },
} satisfies Prisma.PaymentSelect;

const paymentDetailSelect = {
  ...paymentListSelect,
  order: {
    select: {
      id: true,
      orderNo: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
      currency: true,
      soldAt: true,
      note: true,
      createdAt: true,
      resellerId: true,
      stationId: true,
      reseller: {
        select: { id: true, code: true, name: true, status: true },
      },
      station: {
        select: { id: true, code: true, name: true, status: true },
      },
      items: {
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          lineTotal: true,
          plan: { select: { id: true, code: true, name: true } },
          credential: { select: { id: true, token: true, status: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

type PaymentListRow = Prisma.PaymentGetPayload<{ select: typeof paymentListSelect }>;
type PaymentDetailRow = Prisma.PaymentGetPayload<{ select: typeof paymentDetailSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function queryParams(query: AuthenticatedRequest['query']) {
  return {
    orgId: typeof query.orgId === 'string' ? query.orgId : undefined,
    resellerId: typeof query.resellerId === 'string' ? query.resellerId : undefined,
  };
}

function orderScopeFilter(scope: CommerceScope): Prisma.SaleOrderWhereInput {
  if (scope.mode === 'partner') {
    return { resellerId: scope.resellerId };
  }
  if (scope.resellerId) {
    return { resellerId: scope.resellerId };
  }
  return {};
}

function serializePaymentList(row: PaymentListRow) {
  const order = row.order;
  return {
    id: row.id,
    orgId: row.orgId,
    orderId: row.orderId,
    method: row.method,
    amount: decimalToNumber(row.amount),
    refNo: row.refNo,
    paidAt: row.paidAt.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    order: order
      ? {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          total: decimalToNumber(order.total),
          currency: order.currency,
          soldAt: order.soldAt?.toISOString() ?? null,
          resellerId: order.resellerId,
          stationId: order.stationId,
          reseller: order.reseller,
          station: order.station,
          itemCount: order._count.items,
        }
      : null,
  };
}

function serializePaymentDetail(row: PaymentDetailRow) {
  const base = serializePaymentList(row as PaymentListRow);
  const order = row.order;
  if (!order) return base;

  return {
    ...base,
    order: {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      subtotal: decimalToNumber(order.subtotal),
      discount: decimalToNumber(order.discount),
      total: decimalToNumber(order.total),
      currency: order.currency,
      soldAt: order.soldAt?.toISOString() ?? null,
      note: order.note,
      createdAt: order.createdAt.toISOString(),
      resellerId: order.resellerId,
      stationId: order.stationId,
      reseller: order.reseller,
      station: order.station,
      items: order.items.map((item) => ({
        id: item.id,
        qty: item.qty,
        unitPrice: decimalToNumber(item.unitPrice),
        lineTotal: decimalToNumber(item.lineTotal),
        plan: item.plan,
        credential: item.credential,
      })),
    },
  };
}

function buildListWhere(
  scope: CommerceScope,
  query: AuthenticatedRequest['query']
): Prisma.PaymentWhereInput {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const method = typeof query.method === 'string' ? query.method.trim().toUpperCase() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';
  const orderStatus =
    typeof query.orderStatus === 'string' ? query.orderStatus.trim().toUpperCase() : '';

  let orderFilter: Prisma.SaleOrderWhereInput = orderScopeFilter(scope);

  if (stationId) {
    orderFilter = { ...orderFilter, stationId };
  }

  if (orderStatus && (SALE_STATUSES as readonly string[]).includes(orderStatus)) {
    orderFilter = { ...orderFilter, status: orderStatus as SaleStatus };
  }

  const where: Prisma.PaymentWhereInput = {
    orgId: scope.orgId,
    order: orderFilter,
  };

  if (method && (PAYMENT_METHODS as readonly string[]).includes(method)) {
    where.method = method as PaymentMethod;
  }

  if (search) {
    where.OR = [
      { refNo: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { order: { orderNo: { contains: search, mode: 'insensitive' } } },
      { order: { reseller: { code: { contains: search, mode: 'insensitive' } } } },
      { order: { reseller: { name: { contains: search, mode: 'insensitive' } } } },
      { order: { station: { code: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}


/** Revenue / tender stats — only count payments for completed sales. */
function statsPaymentWhere(scope: CommerceScope): Prisma.PaymentWhereInput {
  const orderFilter = orderScopeFilter(scope);
  return {
    orgId: scope.orgId,
    order: {
      ...(typeof orderFilter === 'object' ? orderFilter : {}),
      status: 'PAID',
    },
  };
}

function refundedPaymentWhere(scope: CommerceScope): Prisma.PaymentWhereInput {
  const orderFilter = orderScopeFilter(scope);
  return {
    orgId: scope.orgId,
    order: {
      ...(typeof orderFilter === 'object' ? orderFilter : {}),
      status: 'REFUNDED',
    },
  };
}

function orderStatusPaymentWhere(
  scope: CommerceScope,
  status: SaleStatus
): Prisma.PaymentWhereInput {
  const orderFilter = orderScopeFilter(scope);
  return {
    orgId: scope.orgId,
    order: {
      ...(typeof orderFilter === 'object' ? orderFilter : {}),
      status,
    },
  };
}

/** menus.wifi.commerce.transactions.payments @route /wifi/commerce/transactions/payments */
export class CommerceTransactionsPaymentsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const q = queryParams(req.query);

      if (req.query.formOptions === 'true') {
        let orgId = q.orgId;
        if (!orgId) {
          try {
            const scope = await resolveCommerceScope(this.prisma, adminId, req.user!, q);
            if ('orgId' in scope && !('requiresOrgSelection' in scope)) {
              orgId = scope.orgId;
            }
          } catch {
            orgId = undefined;
          }
        }

        const [memberships, resellers, stations] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId ? loadResellerPicker(this.prisma, orgId) : Promise.resolve([]),
          orgId
            ? this.prisma.wifiStation.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers, stations },
        });
      }

      try {
        const scope = await resolveCommerceScope(this.prisma, adminId, req.user!, q);

        if ('requiresOrgSelection' in scope) {
          return responseSuccess(res, {
            message: 'Success',
            data: [],
            meta: {
              requiresOrgSelection: true,
              memberships: scope.memberships,
            },
          });
        }

        if (!isUndefinedOrUndefinedString(req.params?.id)) {
          const idParam = req.params.id as string | string[];
          const id = Array.isArray(idParam) ? idParam[0] : idParam;

          const row = await this.prisma.payment.findFirst({
            where: {
              id,
              orgId: scope.orgId,
              order: orderScopeFilter(scope),
            },
            select: paymentDetailSelect,
          });

          if (!row) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Payment not found.',
            });
          }

          return responseSuccess(res, {
            message: 'Success',
            data: serializePaymentDetail(row),
          });
        }

        const where = buildListWhere(scope, req.query);
        const { page, limit, skip, take } = parsePagination(req.query);
        const todayStart = startOfUtcDay();
        const monthStart = startOfUtcMonth();
        const baseWhere = statsPaymentWhere(scope);
        const refundedWhere = refundedPaymentWhere(scope);

        const [
          rows,
          total,
          methodGroups,
          todayCount,
          todayAmount,
          monthAmount,
          refundedCount,
          refundedTodayCount,
          refundedTodayAmount,
          refundedMonthAmount,
          paidStatusCount,
          refundedStatusCount,
          voidStatusCount,
          draftStatusCount,
          memberships,
          resellers,
        ] = await Promise.all([
          this.prisma.payment.findMany({
            where,
            select: paymentListSelect,
            orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
            skip,
            take,
          }),
          this.prisma.payment.count({ where }),
          this.prisma.payment.groupBy({
            by: ['method'],
            where: baseWhere,
            _count: { _all: true },
            _sum: { amount: true },
          }),
          this.prisma.payment.count({
            where: { ...baseWhere, paidAt: { gte: todayStart } },
          }),
          this.prisma.payment.aggregate({
            where: { ...baseWhere, paidAt: { gte: todayStart } },
            _sum: { amount: true },
          }),
          this.prisma.payment.aggregate({
            where: { ...baseWhere, paidAt: { gte: monthStart } },
            _sum: { amount: true },
          }),
          this.prisma.payment.count({ where: refundedWhere }),
          this.prisma.payment.count({
            where: { ...refundedWhere, paidAt: { gte: todayStart } },
          }),
          this.prisma.payment.aggregate({
            where: { ...refundedWhere, paidAt: { gte: todayStart } },
            _sum: { amount: true },
          }),
          this.prisma.payment.aggregate({
            where: { ...refundedWhere, paidAt: { gte: monthStart } },
            _sum: { amount: true },
          }),
          this.prisma.payment.count({ where: orderStatusPaymentWhere(scope, 'PAID') }),
          this.prisma.payment.count({ where: orderStatusPaymentWhere(scope, 'REFUNDED') }),
          this.prisma.payment.count({ where: orderStatusPaymentWhere(scope, 'VOID') }),
          this.prisma.payment.count({ where: orderStatusPaymentWhere(scope, 'DRAFT') }),
          scope.mode === 'org'
            ? loadOrgMembershipOptions(this.prisma, adminId, isDeveloper)
            : Promise.resolve(undefined),
          scope.mode === 'org'
            ? loadResellerPicker(this.prisma, scope.orgId)
            : Promise.resolve(undefined),
        ]);

        const methodCounts = Object.fromEntries(
          methodGroups.map((g) => [g.method, g._count._all])
        );
        const methodAmounts = Object.fromEntries(
          methodGroups.map((g) => [g.method, decimalToNumber(g._sum.amount)])
        );

        const currency =
          rows[0]?.order?.currency ??
          (
            await this.prisma.org.findUnique({
              where: { id: scope.orgId },
              select: { currency: true },
            })
          )?.currency ??
          'MMK';

        responseSuccess(res, {
          message: 'Success',
          data: rows.map(serializePaymentList),
          meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            mode: scope.mode,
            orgId: scope.orgId,
            resellerId: scope.mode === 'partner' ? scope.resellerId : scope.resellerId,
            methodCounts,
            methodAmounts,
            todayCount,
            todayAmount: decimalToNumber(todayAmount._sum.amount),
            monthAmount: decimalToNumber(monthAmount._sum.amount),
            refundedCount,
            refundedTodayCount,
            refundedTodayAmount: decimalToNumber(refundedTodayAmount._sum.amount),
            refundedMonthAmount: decimalToNumber(refundedMonthAmount._sum.amount),
            statusCounts: {
              PAID: paidStatusCount,
              REFUNDED: refundedStatusCount,
              VOID: voidStatusCount,
              DRAFT: draftStatusCount,
            },
            currency,
            memberships,
            resellers,
          },
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'PAYMENTS_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to load payments.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Payments ledger is read-only. Payments are recorded via Access Tokens.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Payments cannot be deleted from the ledger.',
      });
    }),
  ];
}
