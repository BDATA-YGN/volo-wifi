import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { startOfAppDay, startOfAppMonth, addAppDays } from '@/utils/app-time';
import { aggregatePlanSales } from '@/features/wifi/commerce/shared/plan-sales';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import {
  loadResellerPicker,
  resolveDirectReseller,
  resolveRoleScopedReseller,
} from '@/features/wifi/commerce/shared/resolve-reseller';
import { SALE_STATUSES, type SaleStatus } from './constants';

const orderListSelect = {
  id: true,
  orgId: true,
  orderNo: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  currency: true,
  note: true,
  soldAt: true,
  createdAt: true,
  updatedAt: true,
  resellerId: true,
  stationId: true,
  reseller: {
    select: { id: true, code: true, name: true, status: true },
  },
  station: {
    select: { id: true, code: true, name: true, status: true },
  },
  _count: {
    select: { items: true, payments: true },
  },
} satisfies Prisma.SaleOrderSelect;

const orderDetailSelect = {
  ...orderListSelect,
  items: {
    select: {
      id: true,
      planId: true,
      credentialId: true,
      qty: true,
      unitPrice: true,
      lineTotal: true,
      createdAt: true,
      plan: {
        select: { id: true, code: true, name: true, quotaType: true },
      },
      credential: {
        select: { id: true, token: true, status: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: {
    select: {
      id: true,
      method: true,
      amount: true,
      refNo: true,
      paidAt: true,
      note: true,
      createdAt: true,
    },
    orderBy: { paidAt: 'desc' as const },
  },
} satisfies Prisma.SaleOrderSelect;

type OrderListRow = Prisma.SaleOrderGetPayload<{ select: typeof orderListSelect }>;
type OrderDetailRow = Prisma.SaleOrderGetPayload<{ select: typeof orderDetailSelect }>;

type OrdersScope =
  | { mode: 'partner'; orgId: string; resellerId: string }
  | { mode: 'org'; orgId: string; resellerId?: string };

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function startOfUtcDay(date = new Date()): Date {
  return startOfAppDay(date);
}

function startOfUtcMonth(date = new Date()): Date {
  return startOfAppMonth(date);
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

async function resolveOrdersScope(
  prisma: PrismaClient,
  adminId: string,
  user: AuthenticatedRequest['user'],
  query: AuthenticatedRequest['query']
): Promise<OrdersScope | { requiresOrgSelection: true; memberships: Awaited<ReturnType<typeof loadOrgMembershipOptions>> }> {
  const { orgId: requestedOrgId, resellerId: requestedResellerId } = queryParams(query);

  if (!requestedResellerId) {
    const direct = await resolveDirectReseller(prisma, adminId);
    if (direct) {
      return { mode: 'partner', orgId: direct.orgId, resellerId: direct.resellerId };
    }
    const scoped = await resolveRoleScopedReseller(prisma, adminId);
    if (scoped) {
      return { mode: 'partner', orgId: scoped.orgId, resellerId: scoped.resellerId };
    }
  }

  let orgId = requestedOrgId;
  if (!orgId) {
    const resolved = await resolveOrgIdForAdmin(prisma, adminId, user!, undefined);
    if ('requiresSelection' in resolved) {
      return { requiresOrgSelection: true, memberships: resolved.memberships };
    }
    orgId = resolved.orgId;
  } else {
    const allowed = await resolveOrgIdForAdmin(prisma, adminId, user!, orgId);
    if ('requiresSelection' in allowed) {
      throw Object.assign(new Error('You do not have access to this organization.'), {
        status: 403,
        code: 'FORBIDDEN_ORG',
      });
    }
    orgId = allowed.orgId;
  }

  if (requestedResellerId) {
    const reseller = await prisma.reseller.findFirst({
      where: { id: requestedResellerId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!reseller) {
      throw Object.assign(new Error('Partner not found for this organization.'), {
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return { mode: 'org', orgId, resellerId: requestedResellerId };
  }

  return { mode: 'org', orgId };
}

function serializeOrderList(row: OrderListRow) {
  return {
    id: row.id,
    orgId: row.orgId,
    orderNo: row.orderNo,
    status: row.status,
    subtotal: decimalToNumber(row.subtotal),
    discount: decimalToNumber(row.discount),
    total: decimalToNumber(row.total),
    currency: row.currency,
    note: row.note,
    soldAt: row.soldAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resellerId: row.resellerId,
    stationId: row.stationId,
    reseller: row.reseller,
    station: row.station,
    itemCount: row._count.items,
    paymentCount: row._count.payments,
  };
}

function serializeOrderDetail(row: OrderDetailRow) {
  return {
    ...serializeOrderList(row),
    items: row.items.map((item) => ({
      id: item.id,
      planId: item.planId,
      credentialId: item.credentialId,
      qty: item.qty,
      unitPrice: decimalToNumber(item.unitPrice),
      lineTotal: decimalToNumber(item.lineTotal),
      createdAt: item.createdAt.toISOString(),
      plan: item.plan,
      credential: item.credential,
    })),
    payments: row.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: decimalToNumber(p.amount),
      refNo: p.refNo,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

function buildListWhere(
  scope: OrdersScope,
  query: AuthenticatedRequest['query']
): Prisma.SaleOrderWhereInput {
  const where: Prisma.SaleOrderWhereInput = { orgId: scope.orgId };

  if (scope.mode === 'partner') {
    where.resellerId = scope.resellerId;
  } else if (scope.resellerId) {
    where.resellerId = scope.resellerId;
  }

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  if (status && (SALE_STATUSES as readonly string[]).includes(status)) {
    where.status = status as SaleStatus;
  }
  if (stationId) where.stationId = stationId;

  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { reseller: { code: { contains: search, mode: 'insensitive' } } },
      { reseller: { name: { contains: search, mode: 'insensitive' } } },
      { station: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
      {
        items: {
          some: { credential: { token: { contains: search, mode: 'insensitive' } } },
        },
      },
    ];
  }

  return where;
}

/** menus.wifi.commerce.transactions.orders @route /wifi/commerce/transactions/orders */
export class CommerceTransactionsOrdersController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined = queryParams(req.query).orgId;
        if (!orgId) {
          try {
            const scope = await resolveOrdersScope(this.prisma, adminId, req.user, req.query);
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
        const scope = await resolveOrdersScope(this.prisma, adminId, req.user, req.query);

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

          const detailWhere: Prisma.SaleOrderWhereInput = {
            id,
            orgId: scope.orgId,
            ...(scope.mode === 'partner' ? { resellerId: scope.resellerId } : {}),
          };

          const row = await this.prisma.saleOrder.findFirst({
            where: detailWhere,
            select: orderDetailSelect,
          });

          if (!row) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Order not found.',
            });
          }

          return responseSuccess(res, {
            message: 'Success',
            data: serializeOrderDetail(row),
          });
        }

        const where = buildListWhere(scope, req.query);
        const { page, limit, skip, take } = parsePagination(req.query);
        const todayStart = startOfUtcDay();
        const monthStart = startOfUtcMonth();
        const last7DaysStart = startOfAppDay(addAppDays(new Date(), -6));

        const baseWhere: Prisma.SaleOrderWhereInput =
          scope.mode === 'partner'
            ? { orgId: scope.orgId, resellerId: scope.resellerId }
            : {
                orgId: scope.orgId,
                ...(scope.resellerId ? { resellerId: scope.resellerId } : {}),
              };

        const [
          rows,
          total,
          statusGroups,
          todayOrders,
          todayRevenue,
          monthRevenue,
          memberships,
          resellers,
          planSalesLast7Days,
        ] = await Promise.all([
          this.prisma.saleOrder.findMany({
            where,
            select: orderListSelect,
            orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
            skip,
            take,
          }),
          this.prisma.saleOrder.count({ where }),
          this.prisma.saleOrder.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { _all: true },
            _sum: { total: true },
          }),
          this.prisma.saleOrder.count({
            where: { ...baseWhere, soldAt: { gte: todayStart }, status: 'PAID' },
          }),
          this.prisma.saleOrder.aggregate({
            where: { ...baseWhere, soldAt: { gte: todayStart }, status: 'PAID' },
            _sum: { total: true },
          }),
          this.prisma.saleOrder.aggregate({
            where: { ...baseWhere, soldAt: { gte: monthStart }, status: 'PAID' },
            _sum: { total: true },
          }),
          scope.mode === 'org'
            ? loadOrgMembershipOptions(this.prisma, adminId, isDeveloper)
            : Promise.resolve(undefined),
          scope.mode === 'org'
            ? loadResellerPicker(this.prisma, scope.orgId)
            : Promise.resolve(undefined),
          aggregatePlanSales(this.prisma, {
            orgId: scope.orgId,
            resellerId: scope.resellerId ?? null,
            soldFrom: last7DaysStart,
          }),
        ]);

        const statusCounts = Object.fromEntries(
          statusGroups.map((g) => [g.status, g._count._all])
        );
        const paidRevenue = statusGroups
          .filter((g) => g.status === 'PAID')
          .reduce((sum, g) => sum + decimalToNumber(g._sum.total), 0);

        const currency =
          rows[0]?.currency ??
          (
            await this.prisma.org.findUnique({
              where: { id: scope.orgId },
              select: { currency: true },
            })
          )?.currency ??
          'MMK';

        responseSuccess(res, {
          message: 'Success',
          data: rows.map(serializeOrderList),
          meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            mode: scope.mode,
            orgId: scope.orgId,
            resellerId: scope.mode === 'partner' ? scope.resellerId : scope.resellerId,
            statusCounts,
            paidRevenue,
            todayOrders,
            todayRevenue: decimalToNumber(todayRevenue._sum.total),
            monthRevenue: decimalToNumber(monthRevenue._sum.total),
            currency,
            salesByPlanLast7Days: planSalesLast7Days.rows,
            tokensLast7Days: planSalesLast7Days.tokenCount,
            revenueLast7Days: planSalesLast7Days.amount,
            salesByStationLast7Days: planSalesLast7Days.byStation,
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
            : 'ORDERS_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to load orders.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Orders ledger is read-only. Sales are created via Access Tokens.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Orders cannot be deleted from the ledger.',
      });
    }),
  ];
}
