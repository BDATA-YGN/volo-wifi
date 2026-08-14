import { PrismaClient } from '@/generated/prisma/client';
import { appDayKey, eachAppDay } from '@/utils/app-time';

export type PlanSalesBrief = {
  id: string;
  code: string;
  name: string;
};

export type StationSalesBrief = {
  id: string;
  code: string;
  name: string;
};

export type PlanSalesRow = {
  planId: string;
  planCode: string;
  planName: string;
  tokenCount: number;
  amount: number;
};

export type StationDaySales = {
  date: string;
  tokenCount: number;
  amount: number;
  plans: PlanSalesRow[];
};

export type StationSalesRow = {
  stationId: string;
  stationCode: string;
  stationName: string;
  tokenCount: number;
  amount: number;
  plans: PlanSalesRow[];
  days: StationDaySales[];
};

export type PlanSalesSummary = {
  rows: PlanSalesRow[];
  tokenCount: number;
  amount: number;
  byStation: StationSalesRow[];
};

function emptyPlanRows(plans: PlanSalesBrief[]): PlanSalesRow[] {
  return plans.map((plan) => ({
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    tokenCount: 0,
    amount: 0,
  }));
}

function emptyDays(plans: PlanSalesBrief[], soldFrom: Date, soldTo: Date): StationDaySales[] {
  return eachAppDay(soldFrom, soldTo).map((day) => ({
    date: appDayKey(day),
    tokenCount: 0,
    amount: 0,
    plans: emptyPlanRows(plans),
  }));
}

function addSale(target: PlanSalesRow | undefined, qty: number, amount: number) {
  if (!target) return;
  target.tokenCount += qty;
  target.amount += amount;
}

function createStationRow(
  station: StationSalesBrief,
  plans: PlanSalesBrief[],
  soldFrom: Date,
  soldTo: Date,
): StationSalesRow {
  return {
    stationId: station.id,
    stationCode: station.code,
    stationName: station.name,
    tokenCount: 0,
    amount: 0,
    plans: emptyPlanRows(plans),
    days: emptyDays(plans, soldFrom, soldTo),
  };
}

export type PlanSalesBrief = {
  id: string;
  code: string;
  name: string;
};

export type StationSalesBrief = {
  id: string;
  code: string;
  name: string;
};

export type PlanSalesRow = {
  planId: string;
  planCode: string;
  planName: string;
  tokenCount: number;
  amount: number;
};

export type StationSalesRow = {
  stationId: string;
  stationCode: string;
  stationName: string;
  tokenCount: number;
  amount: number;
  plans: PlanSalesRow[];
};

export type PlanSalesSummary = {
  rows: PlanSalesRow[];
  tokenCount: number;
  amount: number;
  byStation: StationSalesRow[];
};

function emptyPlanRows(plans: PlanSalesBrief[]): PlanSalesRow[] {
  return plans.map((plan) => ({
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    tokenCount: 0,
    amount: 0,
  }));
}

function addSale(target: PlanSalesRow | undefined, qty: number, amount: number) {
  if (!target) return;
  target.tokenCount += qty;
  target.amount += amount;
}

/**
 * Token qty + line amount by plan for PAID orders in a soldAt window.
 * When plans/stations are omitted and resellerId is set, entitlements and mapped
 * sites are loaded so every assigned shop/plan is present (zero-filled).
 */
export async function aggregatePlanSales(
  prisma: PrismaClient,
  options: {
    orgId: string;
    resellerId?: string | null;
    soldFrom: Date;
    plans?: PlanSalesBrief[];
    stations?: StationSalesBrief[];
  },
): Promise<PlanSalesSummary> {
  const { orgId, resellerId, soldFrom } = options;
  let catalog = options.plans ?? [];
  let stations = options.stations ?? [];

  if (resellerId && (catalog.length === 0 || stations.length === 0)) {
    const [entitlements, mappings] = await Promise.all([
      catalog.length === 0
        ? prisma.resellerPlanEntitlement.findMany({
            where: { resellerId, isEnabled: true },
            select: { plan: { select: { id: true, code: true, name: true } } },
            orderBy: { plan: { name: 'asc' } },
          })
        : Promise.resolve([]),
      stations.length === 0
        ? prisma.resellerStation.findMany({
            where: { resellerId, deletedAt: null },
            select: { station: { select: { id: true, code: true, name: true } } },
            orderBy: { station: { name: 'asc' } },
          })
        : Promise.resolve([]),
    ]);
    if (catalog.length === 0) {
      catalog = entitlements.map((row) => row.plan);
    }
    if (stations.length === 0) {
      stations = mappings.map((row) => row.station);
    }
  }

  const catalogIds = catalog.map((p) => p.id);
  const soldTo = new Date();

  const items = await prisma.saleItem.findMany({
    where: {
      orgId,
      ...(catalogIds.length > 0 ? { planId: { in: catalogIds } } : {}),
      order: {
        status: 'PAID',
        soldAt: { gte: soldFrom },
        ...(resellerId ? { resellerId } : {}),
      },
    },
    select: {
      planId: true,
      qty: true,
      lineTotal: true,
      order: { select: { stationId: true, soldAt: true, createdAt: true } },
    },
  });

  if (catalog.length === 0) {
    const planIds = [...new Set(items.map((item) => item.planId))];
    if (planIds.length > 0) {
      catalog = await prisma.plan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    }
  }

  const planIndex = new Map(catalog.map((plan) => [plan.id, plan]));
  const totalsByPlan = new Map(catalog.map((plan) => [plan.id, emptyPlanRows([plan])[0]]));
  const byStationMap = new Map<string, StationSalesRow>();

  for (const station of stations) {
    byStationMap.set(station.id, createStationRow(station, catalog, soldFrom, soldTo));
  }

  for (const item of items) {
    const qty = item.qty ?? 0;
    const amount = Number(item.lineTotal ?? 0);
    const plan = planIndex.get(item.planId);
    if (!plan) continue;

    let planTotal = totalsByPlan.get(item.planId);
    if (!planTotal) {
      planTotal = {
        planId: plan.id,
        planCode: plan.code,
        planName: plan.name,
        tokenCount: 0,
        amount: 0,
      };
      totalsByPlan.set(item.planId, planTotal);
    }
    addSale(planTotal, qty, amount);

    const stationId = item.order.stationId;
    if (!stationId) continue;

    let stationRow = byStationMap.get(stationId);
    if (!stationRow) {
      stationRow = createStationRow(
        { id: stationId, code: '', name: 'Unknown shop' },
        catalog,
        soldFrom,
        soldTo,
      );
      byStationMap.set(stationId, stationRow);
    }
    stationRow.tokenCount += qty;
    stationRow.amount += amount;
    addSale(
      stationRow.plans.find((row) => row.planId === item.planId),
      qty,
      amount,
    );

    const soldAt = item.order.soldAt ?? item.order.createdAt;
    const dayKey = appDayKey(soldAt);
    const dayRow = stationRow.days.find((row) => row.date === dayKey);
    if (dayRow) {
      dayRow.tokenCount += qty;
      dayRow.amount += amount;
      addSale(
        dayRow.plans.find((row) => row.planId === item.planId),
        qty,
        amount,
      );
    }
  }

  const unknownIds = [...byStationMap.keys()].filter(
    (id) => !stations.some((station) => station.id === id),
  );
  if (unknownIds.length > 0) {
    const found = await prisma.wifiStation.findMany({
      where: { id: { in: unknownIds } },
      select: { id: true, code: true, name: true },
    });
    const names = new Map(found.map((row) => [row.id, row]));
    for (const id of unknownIds) {
      const row = byStationMap.get(id);
      const station = names.get(id);
      if (row && station) {
        row.stationCode = station.code;
        row.stationName = station.name;
      }
    }
  }

  const rows = [...totalsByPlan.values()];
  const byStation = [...byStationMap.values()].sort((a, b) =>
    a.stationName.localeCompare(b.stationName),
  );

  return {
    rows,
    tokenCount: rows.reduce((sum, row) => sum + row.tokenCount, 0),
    amount: rows.reduce((sum, row) => sum + row.amount, 0),
    byStation,
  };
}
