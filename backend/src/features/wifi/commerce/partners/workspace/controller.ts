import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import {
  loadResellerPicker,
  resolveResellerContext,
  type ResellerContext,
} from '@/features/wifi/commerce/shared/resolve-reseller';
import { startOfAppDay, APP_TIMEZONE } from '@/utils/app-time';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const stationBriefSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  location: true,
} satisfies Prisma.WifiStationSelect;

const planBriefSelect = {
  id: true,
  code: true,
  name: true,
  quotaType: true,
  isActive: true,
} satisfies Prisma.PlanSelect;

function startOfAppMonth(date = new Date()): Date {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .startOf('month')
    .toDate();
}

async function loadPricingReadiness(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  entitledPlanIds: string[],
  stationIds: string[]
): Promise<{ pricedPlanCount: number; hasPricing: boolean }> {
  if (entitledPlanIds.length === 0) {
    return { pricedPlanCount: 0, hasPricing: false };
  }

  const books = await prisma.planPriceBook.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { resellers: { some: { resellerId } } },
        ...(stationIds.length > 0
          ? [{ stations: { some: { stationId: { in: stationIds } } } }]
          : []),
        { isDefault: true },
      ],
    },
    select: {
      id: true,
      isDefault: true,
      stations: { select: { stationId: true } },
      resellers: { select: { resellerId: true } },
    },
  });

  const bookIds = books.map((b) => b.id);
  if (bookIds.length === 0) {
    return { pricedPlanCount: 0, hasPricing: false };
  }

  const pricedPlans = await prisma.planPrice.findMany({
    where: {
      orgId,
      deletedAt: null,
      isActive: true,
      priceBookId: { in: bookIds },
      planId: { in: entitledPlanIds },
    },
    select: { planId: true, priceBookId: true },
  });

  const resellerBookIds = new Set(
    books.filter((b) => b.resellers.some((r) => r.resellerId === resellerId)).map((b) => b.id)
  );
  const siteBookIds = new Set(
    books
      .filter((b) => b.stations.some((s) => stationIds.includes(s.stationId)))
      .map((b) => b.id)
  );
  const defaultBookIds = new Set(books.filter((b) => b.isDefault).map((b) => b.id));

  // Priority: Reseller → Site → Organization default (same as sell-time resolution)
  const covered = new Set<string>();
  for (const planId of entitledPlanIds) {
    const rows = pricedPlans.filter((p) => p.planId === planId);
    if (rows.some((r) => resellerBookIds.has(r.priceBookId))) {
      covered.add(planId);
      continue;
    }
    if (rows.some((r) => siteBookIds.has(r.priceBookId))) {
      covered.add(planId);
      continue;
    }
    if (rows.some((r) => defaultBookIds.has(r.priceBookId))) {
      covered.add(planId);
    }
  }

  return {
    pricedPlanCount: covered.size,
    hasPricing: covered.size > 0,
  };
}

async function buildDashboard(
  prisma: PrismaClient,
  context: ResellerContext
) {
  const { resellerId, orgId, mode } = context;
  const todayStart = startOfAppDay(new Date());
  const monthStart = startOfAppMonth();

  const reseller = await prisma.reseller.findFirst({
    where: { id: resellerId, orgId, deletedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      adminId: true,
      createdAt: true,
      org: { select: { id: true, code: true, name: true, currency: true } },
      resellerStations: {
        where: { deletedAt: null },
        select: {
          id: true,
          createdAt: true,
          station: { select: stationBriefSelect },
        },
        orderBy: { station: { name: 'asc' } },
      },
      planEntitlements: {
        where: { isEnabled: true },
        select: {
          id: true,
          planId: true,
          plan: { select: planBriefSelect },
        },
        orderBy: { plan: { name: 'asc' } },
      },
    },
  });

  if (!reseller) {
    throw Object.assign(new Error('Partner not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  const entitledPlanIds = reseller.planEntitlements.map((e) => e.planId);
  const mappedStationIds = reseller.resellerStations.map((rs) => rs.station.id);

  const [
    credentialsSold,
    credentialsActive,
    ordersToday,
    revenueTodayAgg,
    ordersMonth,
    revenueMonthAgg,
    recentOrders,
    pricing,
  ] = await Promise.all([
    prisma.credential.count({
      where: { orgId, resellerId, deletedAt: null, status: 'SOLD' },
    }),
    prisma.credential.count({
      where: { orgId, resellerId, deletedAt: null, status: 'ACTIVATED' },
    }),
    prisma.saleOrder.count({
      where: {
        orgId,
        resellerId,
        soldAt: { gte: todayStart },
        status: 'PAID',
      },
    }),
    prisma.saleOrder.aggregate({
      where: {
        orgId,
        resellerId,
        soldAt: { gte: todayStart },
        status: 'PAID',
      },
      _sum: { total: true },
    }),
    prisma.saleOrder.count({
      where: {
        orgId,
        resellerId,
        soldAt: { gte: monthStart },
        status: 'PAID',
      },
    }),
    prisma.saleOrder.aggregate({
      where: {
        orgId,
        resellerId,
        soldAt: { gte: monthStart },
        status: 'PAID',
      },
      _sum: { total: true },
    }),
    prisma.saleOrder.findMany({
      where: { orgId, resellerId, status: 'PAID' },
      select: {
        id: true,
        orderNo: true,
        status: true,
        total: true,
        currency: true,
        soldAt: true,
        createdAt: true,
        station: { select: { code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    loadPricingReadiness(prisma, orgId, resellerId, entitledPlanIds, mappedStationIds),
  ]);

  const stationCount = reseller.resellerStations.length;
  const planCount = reseller.planEntitlements.length;
  const hasSites = stationCount > 0;
  const hasPlans = planCount > 0;
  const hasPricing = pricing.hasPricing && pricing.pricedPlanCount >= planCount;
  const canSellTokens = hasSites && hasPlans && hasPricing && reseller.status === 'ACTIVE';

  return {
    mode,
    reseller: {
      id: reseller.id,
      code: reseller.code,
      name: reseller.name,
      phone: reseller.phone,
      email: reseller.email,
      status: reseller.status,
      hasPortalAccount: Boolean(reseller.adminId),
      createdAt: reseller.createdAt.toISOString(),
    },
    org: reseller.org,
    stations: reseller.resellerStations.map((rs) => ({
      mappingId: rs.id,
      assignedAt: rs.createdAt.toISOString(),
      ...rs.station,
    })),
    plans: reseller.planEntitlements.map((pe) => ({
      entitlementId: pe.id,
      ...pe.plan,
    })),
    stats: {
      stationCount,
      planCount,
      credentialsSold,
      credentialsActive,
      credentialsIssued: credentialsSold + credentialsActive,
      ordersToday,
      revenueToday: Number(revenueTodayAgg._sum.total ?? 0),
      ordersMonth,
      revenueMonth: Number(revenueMonthAgg._sum.total ?? 0),
    },
    readiness: {
      hasSites,
      hasPlans,
      hasPricing,
      pricedPlanCount: pricing.pricedPlanCount,
      canSellTokens,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      total: Number(o.total),
      currency: o.currency,
      soldAt: o.soldAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      itemCount: o._count.items,
      station: o.station,
    })),
  };
}

/** menus.wifi.commerce.partners.workspace @route /wifi/commerce/partners/workspace */
export class CommercePartnersWorkspaceController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        let resellerId: string | undefined;
        let mode: 'partner' | 'preview' | undefined;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const resellerIdParam =
          typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : '';

        try {
          const context = await resolveResellerContext(this.prisma, adminId, req.user!, {
            orgId: orgIdParam || undefined,
            resellerId: resellerIdParam || undefined,
          });
          if ('requiresOrgSelection' in context) {
            orgId = undefined;
          } else if ('requiresResellerSelection' in context) {
            orgId = context.orgId;
          } else {
            orgId = context.orgId;
            resellerId = context.resellerId;
            mode = context.mode;
          }
        } catch {
          orgId = orgIdParam || undefined;
          resellerId = resellerIdParam || undefined;
        }

        if (!orgId && orgIdParam) {
          orgId = orgIdParam;
        }

        const [memberships, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId ? loadResellerPicker(this.prisma, orgId) : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers },
          meta: {
            mode,
            orgId,
            resellerId,
          },
        });
      }

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user!, {
          orgId: typeof req.query.orgId === 'string' ? req.query.orgId : undefined,
          resellerId:
            typeof req.query.resellerId === 'string' ? req.query.resellerId : undefined,
        });

        if ('requiresOrgSelection' in context) {
          return responseSuccess(res, {
            message: 'Success',
            data: null,
            meta: {
              requiresOrgSelection: true,
              memberships: context.memberships,
            },
          });
        }

        if ('requiresResellerSelection' in context) {
          const memberships = await loadOrgMembershipOptions(
            this.prisma,
            adminId,
            isDeveloper
          );
          return responseSuccess(res, {
            message: 'Success',
            data: null,
            meta: {
              requiresResellerSelection: true,
              orgId: context.orgId,
              resellers: context.resellers,
              memberships,
            },
          });
        }

        const dashboard = await buildDashboard(this.prisma, context);
        const memberships = await loadOrgMembershipOptions(
          this.prisma,
          adminId,
          isDeveloper
        );
        const resellers =
          dashboard.mode === 'preview'
            ? await loadResellerPicker(this.prisma, context.orgId)
            : [];

        responseSuccess(res, {
          message: 'Success',
          data: dashboard,
          meta: {
            mode: dashboard.mode,
            orgId: context.orgId,
            resellerId: context.resellerId,
            memberships: dashboard.mode === 'preview' ? memberships : undefined,
            resellers: dashboard.mode === 'preview' ? resellers : undefined,
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
            : 'WORKSPACE_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to load partner workspace.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Partner workspace is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Partner workspace is read-only.',
      });
    }),
  ];
}
