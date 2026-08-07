import { Prisma, PrismaClient } from '@/generated/prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  APP_TIMEZONE,
  appDayKey as utcDayKey,
  eachAppDay,
  endOfAppDay,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';
import type { TrendGranularity } from './constants';

dayjs.extend(utc);
dayjs.extend(timezone);

function appTz(date: Date = new Date()) {
  return dayjs(date).tz(process.env.TZ || APP_TIMEZONE);
}

export type RevenueAnalyticsSummary = {
  revenue: number;
  netRevenue: number;
  commission: number;
  ordersCount: number;
  itemsCount: number;
  paymentsCollected: number;
  paymentCount: number;
  avgOrderValue: number;
};

export type RevenueTrendPoint = {
  periodKey: string;
  label: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type PaymentMethodRow = {
  method: string;
  paymentsCount: number;
  amount: number;
};

export type OrderStatusRow = {
  status: string;
  ordersCount: number;
  revenue: number;
};

export type RevenueAnalyticsPayload = {
  summary: RevenueAnalyticsSummary;
  previousSummary: RevenueAnalyticsSummary;
  trend: RevenueTrendPoint[];
  trendGranularity: TrendGranularity;
  byPaymentMethod: PaymentMethodRow[];
  byOrderStatus: OrderStatusRow[];
  dataSource: 'aggregated' | 'live';
};

type TrendBucket = {
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptySummary(): RevenueAnalyticsSummary {
  return {
    revenue: 0,
    netRevenue: 0,
    commission: 0,
    ordersCount: 0,
    itemsCount: 0,
    paymentsCollected: 0,
    paymentCount: 0,
    avgOrderValue: 0,
  };
}

function finalizeSummary(partial: Omit<RevenueAnalyticsSummary, 'avgOrderValue'>): RevenueAnalyticsSummary {
  return {
    ...partial,
    revenue: roundMoney(partial.revenue),
    netRevenue: roundMoney(partial.netRevenue),
    commission: roundMoney(partial.commission),
    paymentsCollected: roundMoney(partial.paymentsCollected),
    avgOrderValue:
      partial.ordersCount > 0 ? roundMoney(partial.revenue / partial.ordersCount) : 0,
  };
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  if (preset === '12m') {
    const end = endOfAppDay(periodTo);
    const start = appTz(periodTo).subtract(11, 'month').startOf('month').toDate();
    return { periodFrom: start, periodTo: end };
  }

  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return resolvePeriodFromPresetDays(days, periodTo);
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  return previousAppPeriod(periodFrom, periodTo);
}

export function resolveTrendGranularity(periodFrom: Date, periodTo: Date): TrendGranularity {
  const days = Math.ceil((periodTo.getTime() - periodFrom.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days > 366) return 'yearly';
  if (days > 93) return 'monthly';
  return 'daily';
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildDailySeries(
  buckets: Map<string, TrendBucket>,
  periodFrom: Date,
  periodTo: Date
): RevenueTrendPoint[] {
  const points: RevenueTrendPoint[] = [];
  for (const cursor of eachAppDay(periodFrom, periodTo)) {
    const key = utcDayKey(cursor);
    const bucket = buckets.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    points.push({
      periodKey: key,
      label: key,
      ordersCount: bucket.ordersCount,
      itemsCount: bucket.itemsCount,
      revenue: roundMoney(bucket.revenue),
      commission: roundMoney(bucket.commission),
      netRevenue: roundMoney(bucket.netRevenue),
    });
  }

  return points;
}

function buildMonthlySeries(
  buckets: Map<string, TrendBucket>,
  periodFrom: Date,
  periodTo: Date
): RevenueTrendPoint[] {
  const points: RevenueTrendPoint[] = [];
  let cursor = appTz(periodFrom).startOf('month');
  const end = appTz(periodTo).startOf('month');

  while (cursor.isBefore(end) || cursor.isSame(end, 'month')) {
    const key = monthKey(cursor.year(), cursor.month() + 1);
    const bucket = buckets.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    points.push({
      periodKey: key,
      label: key,
      ordersCount: bucket.ordersCount,
      itemsCount: bucket.itemsCount,
      revenue: roundMoney(bucket.revenue),
      commission: roundMoney(bucket.commission),
      netRevenue: roundMoney(bucket.netRevenue),
    });
    cursor = cursor.add(1, 'month');
  }

  return points;
}

function buildYearlySeries(
  buckets: Map<string, TrendBucket>,
  periodFrom: Date,
  periodTo: Date
): RevenueTrendPoint[] {
  const points: RevenueTrendPoint[] = [];
  for (let year = appTz(periodFrom).year(); year <= appTz(periodTo).year(); year += 1) {
    const key = String(year);
    const bucket = buckets.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    points.push({
      periodKey: key,
      label: key,
      ordersCount: bucket.ordersCount,
      itemsCount: bucket.itemsCount,
      revenue: roundMoney(bucket.revenue),
      commission: roundMoney(bucket.commission),
      netRevenue: roundMoney(bucket.netRevenue),
    });
  }
  return points;
}

function seriesFromBuckets(
  buckets: Map<string, TrendBucket>,
  granularity: TrendGranularity,
  periodFrom: Date,
  periodTo: Date
): RevenueTrendPoint[] {
  if (granularity === 'yearly') return buildYearlySeries(buckets, periodFrom, periodTo);
  if (granularity === 'monthly') return buildMonthlySeries(buckets, periodFrom, periodTo);
  return buildDailySeries(buckets, periodFrom, periodTo);
}

function summaryFromBuckets(buckets: Map<string, TrendBucket>): RevenueAnalyticsSummary {
  const totals = emptySummary();
  for (const bucket of buckets.values()) {
    totals.ordersCount += bucket.ordersCount;
    totals.itemsCount += bucket.itemsCount;
    totals.revenue += bucket.revenue;
    totals.commission += bucket.commission;
    totals.netRevenue += bucket.netRevenue;
  }
  return finalizeSummary(totals);
}

async function loadPaymentBreakdown(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<{ byPaymentMethod: PaymentMethodRow[]; paymentsCollected: number; paymentCount: number }> {
  const payments = await prisma.payment.findMany({
    where: { orgId, paidAt: { gte: periodFrom, lte: periodTo } },
    select: { method: true, amount: true },
  });

  const methodMap = new Map<string, { paymentsCount: number; amount: number }>();
  let paymentsCollected = 0;

  for (const payment of payments) {
    const amount = decimalToNumber(payment.amount);
    paymentsCollected += amount;
    const row = methodMap.get(payment.method) ?? { paymentsCount: 0, amount: 0 };
    row.paymentsCount += 1;
    row.amount += amount;
    methodMap.set(payment.method, row);
  }

  return {
    paymentsCollected: roundMoney(paymentsCollected),
    paymentCount: payments.length,
    byPaymentMethod: [...methodMap.entries()]
      .map(([method, stats]) => ({
        method,
        paymentsCount: stats.paymentsCount,
        amount: roundMoney(stats.amount),
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

async function loadOrderStatusBreakdown(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<OrderStatusRow[]> {
  const orders = await prisma.saleOrder.findMany({
    where: {
      orgId,
      OR: [
        { soldAt: { gte: periodFrom, lte: periodTo } },
        { status: 'DRAFT', createdAt: { gte: periodFrom, lte: periodTo } },
      ],
    },
    select: { status: true, total: true },
  });

  const statusMap = new Map<string, { ordersCount: number; revenue: number }>();
  for (const order of orders) {
    const row = statusMap.get(order.status) ?? { ordersCount: 0, revenue: 0 };
    row.ordersCount += 1;
    if (order.status === 'PAID') {
      row.revenue += decimalToNumber(order.total);
    }
    statusMap.set(order.status, row);
  }

  const statusOrder = ['PAID', 'DRAFT', 'VOID', 'REFUNDED'];
  return statusOrder
    .filter((s) => statusMap.has(s))
    .map((status) => {
      const row = statusMap.get(status)!;
      return {
        status,
        ordersCount: row.ordersCount,
        revenue: roundMoney(row.revenue),
      };
    });
}

async function aggregateFromStats(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  granularity: TrendGranularity
): Promise<{ summary: RevenueAnalyticsSummary; trend: RevenueTrendPoint[] } | null> {
  const buckets = new Map<string, TrendBucket>();

  if (granularity === 'daily') {
    const rows = await prisma.dailySalesStat.findMany({
      where: { orgId, deletedAt: null, date: { gte: periodFrom, lte: periodTo } },
      select: {
        date: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    });
    if (rows.length === 0) return null;

    for (const row of rows) {
      const key = utcDayKey(row.date);
      const bucket = buckets.get(key) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      bucket.ordersCount += row.ordersCount;
      bucket.itemsCount += row.itemsCount;
      bucket.revenue += decimalToNumber(row.revenue);
      bucket.commission += decimalToNumber(row.commission);
      bucket.netRevenue += decimalToNumber(row.netRevenue);
      buckets.set(key, bucket);
    }
  } else if (granularity === 'monthly') {
    const fromYear = appTz(periodFrom).year();
    const toYear = appTz(periodTo).year();
    const fromKey = fromYear * 100 + (appTz(periodFrom).month() + 1);
    const toKey = toYear * 100 + (appTz(periodTo).month() + 1);

    const rows = (
      await prisma.monthlySalesStat.findMany({
        where: {
          orgId,
          deletedAt: null,
          year: {
            gte: fromYear,
            lte: toYear,
          },
        },
        select: {
          year: true,
          month: true,
          ordersCount: true,
          itemsCount: true,
          revenue: true,
          commission: true,
          netRevenue: true,
        },
      })
    ).filter((row) => {
      const key = row.year * 100 + row.month;
      return key >= fromKey && key <= toKey;
    });
    if (rows.length === 0) return null;

    for (const row of rows) {
      const key = monthKey(row.year, row.month);
      const bucket = buckets.get(key) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      bucket.ordersCount += row.ordersCount;
      bucket.itemsCount += row.itemsCount;
      bucket.revenue += decimalToNumber(row.revenue);
      bucket.commission += decimalToNumber(row.commission);
      bucket.netRevenue += decimalToNumber(row.netRevenue);
      buckets.set(key, bucket);
    }
  } else {
    const rows = await prisma.yearlySalesStat.findMany({
      where: {
        orgId,
        deletedAt: null,
        year: { gte: appTz(periodFrom).year(), lte: appTz(periodTo).year() },
      },
      select: {
        year: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    });
    if (rows.length === 0) return null;

    for (const row of rows) {
      const key = String(row.year);
      const bucket = buckets.get(key) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      bucket.ordersCount += row.ordersCount;
      bucket.itemsCount += row.itemsCount;
      bucket.revenue += decimalToNumber(row.revenue);
      bucket.commission += decimalToNumber(row.commission);
      bucket.netRevenue += decimalToNumber(row.netRevenue);
      buckets.set(key, bucket);
    }
  }

  return {
    summary: summaryFromBuckets(buckets),
    trend: seriesFromBuckets(buckets, granularity, periodFrom, periodTo),
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  granularity: TrendGranularity
): Promise<{ summary: RevenueAnalyticsSummary; trend: RevenueTrendPoint[] }> {
  const orders = await prisma.saleOrder.findMany({
    where: {
      orgId,
      status: 'PAID',
      soldAt: { gte: periodFrom, lte: periodTo },
    },
    select: {
      total: true,
      soldAt: true,
      items: { select: { qty: true } },
    },
  });

  const buckets = new Map<string, TrendBucket>();

  for (const order of orders) {
    if (!order.soldAt) continue;
    const revenue = decimalToNumber(order.total);
    const itemsCount = order.items.reduce((s, i) => s + i.qty, 0);

    let key: string;
    if (granularity === 'yearly') {
      key = String(appTz(order.soldAt).year());
    } else if (granularity === 'monthly') {
      const d = appTz(order.soldAt);
      key = monthKey(d.year(), d.month() + 1);
    } else {
      key = utcDayKey(order.soldAt);
    }

    const bucket = buckets.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    bucket.ordersCount += 1;
    bucket.itemsCount += itemsCount;
    bucket.revenue += revenue;
    bucket.netRevenue += revenue;
    buckets.set(key, bucket);
  }

  return {
    summary: summaryFromBuckets(buckets),
    trend: seriesFromBuckets(buckets, granularity, periodFrom, periodTo),
  };
}

export async function buildRevenueAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<RevenueAnalyticsPayload> {
  const trendGranularity = resolveTrendGranularity(periodFrom, periodTo);

  const aggregated = await aggregateFromStats(prisma, orgId, periodFrom, periodTo, trendGranularity);
  const live = aggregated ?? (await aggregateFromLiveOrders(prisma, orgId, periodFrom, periodTo, trendGranularity));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromStats(
    prisma,
    orgId,
    prev.from,
    prev.to,
    resolveTrendGranularity(prev.from, prev.to)
  );
  const prevLive =
    prevAggregated ??
    (await aggregateFromLiveOrders(prisma, orgId, prev.from, prev.to, resolveTrendGranularity(prev.from, prev.to)));

  const [payments, orderStatus] = await Promise.all([
    loadPaymentBreakdown(prisma, orgId, periodFrom, periodTo),
    loadOrderStatusBreakdown(prisma, orgId, periodFrom, periodTo),
  ]);

  const summary = finalizeSummary({
    ...live.summary,
    paymentsCollected: payments.paymentsCollected,
    paymentCount: payments.paymentCount,
  });

  const previousSummary = finalizeSummary({
    ...prevLive.summary,
    paymentsCollected: 0,
    paymentCount: 0,
  });

  return {
    summary,
    previousSummary,
    trend: live.trend,
    trendGranularity,
    byPaymentMethod: payments.byPaymentMethod,
    byOrderStatus: orderStatus,
    dataSource: aggregated ? 'aggregated' : 'live',
  };
}
