import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { commissionForLine } from '@/jobs/reporting/lib/commission';
import type {
  SiteAnalyticsSource,
  SitePlanBreakdown,
  SiteRow,
} from './build-site-analytics';

export type SiteDetailPartnerRow = {
  resellerId: string | null;
  code: string;
  name: string;
  status: string;
  assigned: boolean;
  ordersCount: number;
  tokensCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type SiteDetailPayload = {
  site: SiteRow;
  byPlan: SitePlanBreakdown[];
  byPartner: SiteDetailPartnerRow[];
  assignedPartnerCount: number;
  sellingPartnerCount: number;
  dataSource: SiteAnalyticsSource;
};

type PartnerMeta = {
  id: string;
  code: string;
  name: string;
  status: string;
  assigned: boolean;
};

type PartnerBucket = {
  ordersCount: number;
  tokensCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  orderIds: Set<string>;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function partnerKey(resellerId: string | null | undefined): string {
  return resellerId || 'unassigned';
}

function emptySite(station: {
  id: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
}): SiteRow {
  return {
    stationId: station.id,
    code: station.code,
    name: station.name,
    status: station.status,
    location: station.location,
    stationSizeId: station.stationSizeId,
    stationSizeCode: station.stationSizeCode,
    stationSizeName: station.stationSizeName,
    ordersCount: 0,
    itemsCount: 0,
    revenue: 0,
    commission: 0,
    netRevenue: 0,
    sessionsCount: 0,
    uniqueCredentials: 0,
    totalBytes: 0,
    byPlan: [],
  };
}

function mergePartnerRows(
  partners: Map<string, PartnerMeta>,
  sales: Map<string, PartnerBucket>
): SiteDetailPartnerRow[] {
  const ids = new Set([...partners.keys(), ...sales.keys()]);
  return [...ids]
    .map((id) => {
      const meta = partners.get(id);
      const bucket = sales.get(id);
      return {
        resellerId: id === 'unassigned' ? null : (meta?.id ?? id),
        code: meta?.code ?? '—',
        name: meta?.name ?? 'Unassigned',
        status: meta?.status ?? 'UNKNOWN',
        assigned: meta?.assigned ?? false,
        ordersCount: bucket?.ordersCount ?? 0,
        tokensCount: bucket?.tokensCount ?? 0,
        revenue: money(bucket?.revenue ?? 0),
        commission: money(bucket?.commission ?? 0),
        netRevenue: money(bucket?.netRevenue ?? (bucket?.revenue ?? 0) - (bucket?.commission ?? 0)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
}

async function loadAssignedPartners(
  prisma: PrismaClient,
  orgId: string,
  stationId: string
): Promise<Map<string, PartnerMeta>> {
  const links = await prisma.resellerStation.findMany({
    where: { orgId, stationId, deletedAt: null, reseller: { deletedAt: null } },
    select: {
      reseller: { select: { id: true, code: true, name: true, status: true } },
    },
  });

  const map = new Map<string, PartnerMeta>();
  for (const link of links) {
    map.set(link.reseller.id, {
      id: link.reseller.id,
      code: link.reseller.code,
      name: link.reseller.name,
      status: link.reseller.status,
      assigned: true,
    });
  }
  return map;
}

async function loadSiteDetailLive(
  prisma: PrismaClient,
  orgId: string,
  station: SiteRow,
  periodFrom: Date,
  periodTo: Date,
  partners: Map<string, PartnerMeta>
): Promise<SiteDetailPayload> {
  type LiveItemRow = {
    orderId: string;
    resellerId: string | null;
    planId: string;
    planCode: string;
    planName: string;
    qty: number;
    lineTotal: Prisma.Decimal | number;
  };

  const [itemRows, usageRows, rules] = await Promise.all([
    prisma.$queryRaw<LiveItemRow[]>`
      SELECT
        so.id AS "orderId",
        so.reseller_id AS "resellerId",
        si.plan_id AS "planId",
        p.code AS "planCode",
        p.name AS "planName",
        si.qty::int AS qty,
        si.line_total AS "lineTotal"
      FROM wf_sale_order so
      INNER JOIN wf_sale_item si ON si.order_id = so.id
      LEFT JOIN wf_plan p ON p.id = si.plan_id
      WHERE so.org_id = ${orgId}
        AND so.status = 'PAID'
        AND so.sold_at >= ${periodFrom}
        AND so.sold_at <= ${periodTo}
        AND so.station_id = ${station.stationId}
    `,
    prisma.$queryRaw<
      {
        sessionsCount: number;
        uniqueCredentials: number;
        totalBytes: bigint | number;
      }[]
    >`
      SELECT
        COUNT(*)::int AS "sessionsCount",
        COUNT(DISTINCT rs.credential_id)::int AS "uniqueCredentials",
        COALESCE(SUM(COALESCE(rs."totalBytes", 0)), 0) AS "totalBytes"
      FROM wf_radius_session rs
      LEFT JOIN wf_credential c ON c.id = rs.credential_id
      WHERE (rs.org_id = ${orgId} OR c.org_id = ${orgId})
        AND rs.started_at >= ${periodFrom}
        AND rs.started_at <= ${periodTo}
        AND COALESCE(rs.station_id, c.station_id) = ${station.stationId}
    `,
    prisma.commissionRule.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: {
        resellerId: true,
        planId: true,
        type: true,
        value: true,
        isActive: true,
      },
    }),
  ]);

  const sellingResellerIds = [
    ...new Set(itemRows.map((row) => row.resellerId).filter((id): id is string => Boolean(id))),
  ];
  if (sellingResellerIds.length > 0) {
    const extras = await prisma.reseller.findMany({
      where: { orgId, id: { in: sellingResellerIds }, deletedAt: null },
      select: { id: true, code: true, name: true, status: true },
    });
    for (const reseller of extras) {
      const current = partners.get(reseller.id);
      partners.set(reseller.id, {
        id: reseller.id,
        code: reseller.code,
        name: reseller.name,
        status: reseller.status,
        assigned: current?.assigned ?? false,
      });
    }
  }

  const planMap = new Map<string, SitePlanBreakdown>();
  const sales = new Map<string, PartnerBucket>();
  const site = { ...station };

  for (const row of itemRows) {
    const revenue = decimalToNumber(row.lineTotal as Prisma.Decimal);
    const commission = commissionForLine(
      rules,
      row.resellerId,
      row.planId,
      row.lineTotal as Prisma.Decimal,
      row.qty
    );
    const key = partnerKey(row.resellerId);
    const bucket =
      sales.get(key) ??
      ({
        ordersCount: 0,
        tokensCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        orderIds: new Set<string>(),
      } satisfies PartnerBucket);
    if (!bucket.orderIds.has(row.orderId)) {
      bucket.orderIds.add(row.orderId);
      bucket.ordersCount += 1;
    }
    bucket.tokensCount += row.qty;
    bucket.revenue += revenue;
    bucket.commission += commission;
    bucket.netRevenue = bucket.revenue - bucket.commission;
    sales.set(key, bucket);

    const plan = planMap.get(row.planId) ?? {
      planId: row.planId,
      code: row.planCode || '—',
      name: row.planName || 'Unknown plan',
      tokensCount: 0,
      revenue: 0,
    };
    plan.tokensCount += row.qty;
    plan.revenue += revenue;
    planMap.set(row.planId, plan);

    site.itemsCount += row.qty;
    site.revenue += revenue;
    site.commission += commission;
  }

  site.ordersCount = [...sales.values()].reduce((sum, bucket) => sum + bucket.ordersCount, 0);
  site.netRevenue = site.revenue - site.commission;
  site.sessionsCount = usageRows[0]?.sessionsCount ?? 0;
  site.uniqueCredentials = usageRows[0]?.uniqueCredentials ?? 0;
  site.totalBytes = bigintToNumber(
    typeof usageRows[0]?.totalBytes === 'bigint'
      ? usageRows[0].totalBytes
      : usageRows[0]?.totalBytes != null
        ? BigInt(usageRows[0].totalBytes)
        : 0n
  );

  const byPlan = [...planMap.values()]
    .map((plan) => ({ ...plan, revenue: money(plan.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
  site.byPlan = byPlan;
  site.revenue = money(site.revenue);
  site.commission = money(site.commission);
  site.netRevenue = money(site.netRevenue);

  const byPartner = mergePartnerRows(partners, sales);
  return {
    site,
    byPlan,
    byPartner,
    assignedPartnerCount: [...partners.values()].filter((p) => p.assigned).length,
    sellingPartnerCount: byPartner.filter((p) => p.tokensCount > 0).length,
    dataSource: 'live',
  };
}

async function loadSiteDetailAggregated(
  prisma: PrismaClient,
  orgId: string,
  station: SiteRow,
  periodFrom: Date,
  periodTo: Date,
  partners: Map<string, PartnerMeta>
): Promise<SiteDetailPayload> {
  const where = {
    orgId,
    deletedAt: null as null,
    date: { gte: periodFrom, lte: periodTo },
    stationId: station.stationId,
  };

  const [salesRows, usageAgg] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where,
      select: {
        resellerId: true,
        planId: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
        reseller: { select: { id: true, code: true, name: true, status: true } },
        plan: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where,
      _sum: {
        sessionsCount: true,
        uniqueCredentials: true,
        totalBytes: true,
      },
    }),
  ]);

  const planMap = new Map<string, SitePlanBreakdown>();
  const sales = new Map<string, PartnerBucket>();
  const site = { ...station };

  for (const row of salesRows) {
    if (row.reseller && !partners.has(row.reseller.id)) {
      partners.set(row.reseller.id, {
        id: row.reseller.id,
        code: row.reseller.code,
        name: row.reseller.name,
        status: row.reseller.status,
        assigned: false,
      });
    }

    const key = partnerKey(row.resellerId);
    const bucket =
      sales.get(key) ??
      ({
        ordersCount: 0,
        tokensCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        orderIds: new Set<string>(),
      } satisfies PartnerBucket);
    bucket.ordersCount += row.ordersCount;
    bucket.tokensCount += row.itemsCount;
    bucket.revenue += decimalToNumber(row.revenue);
    bucket.commission += decimalToNumber(row.commission);
    bucket.netRevenue += decimalToNumber(row.netRevenue);
    sales.set(key, bucket);

    if (row.planId && row.plan) {
      const plan = planMap.get(row.planId) ?? {
        planId: row.plan.id,
        code: row.plan.code,
        name: row.plan.name,
        tokensCount: 0,
        revenue: 0,
      };
      plan.tokensCount += row.itemsCount;
      plan.revenue += decimalToNumber(row.revenue);
      planMap.set(row.planId, plan);
    }

    site.ordersCount += row.ordersCount;
    site.itemsCount += row.itemsCount;
    site.revenue += decimalToNumber(row.revenue);
    site.commission += decimalToNumber(row.commission);
    site.netRevenue += decimalToNumber(row.netRevenue);
  }

  site.sessionsCount = usageAgg._sum.sessionsCount ?? 0;
  site.uniqueCredentials = usageAgg._sum.uniqueCredentials ?? 0;
  site.totalBytes = bigintToNumber(usageAgg._sum.totalBytes);
  site.revenue = money(site.revenue);
  site.commission = money(site.commission);
  site.netRevenue = money(site.netRevenue);

  const byPlan = [...planMap.values()]
    .map((plan) => ({ ...plan, revenue: money(plan.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
  site.byPlan = byPlan;

  const byPartner = mergePartnerRows(partners, sales);
  return {
    site,
    byPlan,
    byPartner,
    assignedPartnerCount: [...partners.values()].filter((p) => p.assigned).length,
    sellingPartnerCount: byPartner.filter((p) => p.tokensCount > 0).length,
    dataSource: 'aggregated',
  };
}

export async function buildSiteDetailAnalytics(
  prisma: PrismaClient,
  orgId: string,
  stationId: string,
  periodFrom: Date,
  periodTo: Date,
  source: SiteAnalyticsSource
): Promise<SiteDetailPayload | null> {
  const station = await prisma.wifiStation.findFirst({
    where: { id: stationId, orgId, deletedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      location: true,
      stationSizeId: true,
      stationSize: { select: { code: true, name: true } },
    },
  });
  if (!station) return null;

  const site = emptySite({
    id: station.id,
    code: station.code,
    name: station.name,
    status: station.status,
    location: station.location,
    stationSizeId: station.stationSizeId,
    stationSizeCode: station.stationSize.code,
    stationSizeName: station.stationSize.name,
  });
  const partners = await loadAssignedPartners(prisma, orgId, stationId);

  return source === 'live'
    ? loadSiteDetailLive(prisma, orgId, site, periodFrom, periodTo, partners)
    : loadSiteDetailAggregated(prisma, orgId, site, periodFrom, periodTo, partners);
}
