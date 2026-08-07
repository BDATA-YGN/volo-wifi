import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  eachAppDay,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

export type SettlementSummary = {
  settlementCount: number;
  openCount: number;
  postedCount: number;
  rejectedCount: number;
  withVarianceCount: number;
  systemTotal: number;
  declaredTotal: number;
  varianceTotal: number;
  systemPaymentsCount: number;
  systemOrdersCount: number;
};

export type SettlementStatusRow = {
  status: string;
  count: number;
  systemTotal: number;
  declaredTotal: number;
};

export type SettlementPartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
  openCount: number;
};

export type SettlementSiteRow = {
  stationId: string;
  code: string;
  name: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
  openCount: number;
};

export type SettlementDailyPoint = {
  date: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
};

export type SettlementRow = {
  settlementId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  systemCurrency: string;
  systemTotal: number;
  declaredTotal: number | null;
  declaredCurrency: string;
  variance: number | null;
  systemPaymentsCount: number;
  systemOrdersCount: number;
  hasPosting: boolean;
  declaredNote: string | null;
  updatedAt: string;
};

export type SettlementLineRow = {
  paymentMethod: string;
  systemAmount: number;
  systemPaymentsCount: number;
  systemOrdersCount: number;
  declaredAmount: number | null;
  varianceAmount: number | null;
};

export type SettlementDetail = SettlementRow & {
  lines: SettlementLineRow[];
  attestationCount: number;
};

export type SettlementAnalyticsPayload = {
  summary: SettlementSummary;
  previousSummary: SettlementSummary;
  byStatus: SettlementStatusRow[];
  byPartner: SettlementPartnerRow[];
  bySite: SettlementSiteRow[];
  dailyTrend: SettlementDailyPoint[];
  settlements: SettlementRow[];
};

type SettlementFilters = {
  stationId?: string;
  resellerId?: string;
  status?: string;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function emptySummary(): SettlementSummary {
  return {
    settlementCount: 0,
    openCount: 0,
    postedCount: 0,
    rejectedCount: 0,
    withVarianceCount: 0,
    systemTotal: 0,
    declaredTotal: 0,
    varianceTotal: 0,
    systemPaymentsCount: 0,
    systemOrdersCount: 0,
  };
}

function settlementVariance(
  systemTotal: Prisma.Decimal,
  declaredTotal: Prisma.Decimal | null
): number | null {
  if (declaredTotal == null) return null;
  return Math.round((decimalToNumber(declaredTotal) - decimalToNumber(systemTotal)) * 100) / 100;
}

function isOpenStatus(status: string): boolean {
  return status !== 'POSTED' && status !== 'REJECTED';
}

function buildWhere(
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: SettlementFilters
): Prisma.RptFinSettlementWhereInput {
  return {
    orgId,
    deletedAt: null,
    periodStart: { gte: periodFrom, lte: periodTo },
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId ? { resellerId: filters.resellerId } : {}),
    ...(filters?.status
      ? { status: filters.status as Prisma.EnumRptFinSettlementStatusFilter['equals'] }
      : {}),
  };
}

function serializeSettlement(row: {
  id: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  resellerId: string;
  stationId: string;
  systemCurrency: string;
  systemTotal: Prisma.Decimal;
  declaredCurrency: string;
  declaredTotal: Prisma.Decimal | null;
  declaredNote: string | null;
  systemPaymentsCount: number;
  systemOrdersCount: number;
  updatedAt: Date;
  reseller: { code: string; name: string };
  station: { code: string; name: string };
  posting: { id: string } | null;
}): SettlementRow {
  const variance = settlementVariance(row.systemTotal, row.declaredTotal);
  return {
    settlementId: row.id,
    status: row.status,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    resellerId: row.resellerId,
    resellerCode: row.reseller.code,
    resellerName: row.reseller.name,
    stationId: row.stationId,
    stationCode: row.station.code,
    stationName: row.station.name,
    systemCurrency: row.systemCurrency,
    systemTotal: decimalToNumber(row.systemTotal),
    declaredTotal: row.declaredTotal != null ? decimalToNumber(row.declaredTotal) : null,
    declaredCurrency: row.declaredCurrency,
    variance,
    systemPaymentsCount: row.systemPaymentsCount,
    systemOrdersCount: row.systemOrdersCount,
    hasPosting: Boolean(row.posting),
    declaredNote: row.declaredNote,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const settlementSelect = {
  id: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  resellerId: true,
  stationId: true,
  systemCurrency: true,
  systemTotal: true,
  declaredCurrency: true,
  declaredTotal: true,
  declaredNote: true,
  systemPaymentsCount: true,
  systemOrdersCount: true,
  updatedAt: true,
  reseller: { select: { code: true, name: true } },
  station: { select: { code: true, name: true } },
  posting: { select: { id: true } },
} satisfies Prisma.RptFinSettlementSelect;

function aggregateSettlements(
  rows: Prisma.RptFinSettlementGetPayload<{ select: typeof settlementSelect }>[],
  periodFrom: Date,
  periodTo: Date
): SettlementAnalyticsPayload {
  const summary = emptySummary();
  const statusMap = new Map<string, SettlementStatusRow>();
  const partnerMap = new Map<string, SettlementPartnerRow>();
  const siteMap = new Map<string, SettlementSiteRow>();
  const dailyMap = new Map<string, { settlementCount: number; systemTotal: number; varianceTotal: number }>();

  const settlements: SettlementRow[] = [];

  for (const row of rows) {
    const serialized = serializeSettlement(row);
    settlements.push(serialized);

    const systemTotal = serialized.systemTotal;
    const declaredTotal = serialized.declaredTotal ?? 0;
    const variance = serialized.variance ?? 0;

    summary.settlementCount += 1;
    summary.systemTotal += systemTotal;
    summary.declaredTotal += declaredTotal;
    if (serialized.variance != null) summary.varianceTotal += variance;
    summary.systemPaymentsCount += row.systemPaymentsCount;
    summary.systemOrdersCount += row.systemOrdersCount;

    if (isOpenStatus(row.status)) summary.openCount += 1;
    if (row.status === 'POSTED') summary.postedCount += 1;
    if (row.status === 'REJECTED') summary.rejectedCount += 1;
    if (serialized.variance != null && Math.abs(serialized.variance) > 0.009) {
      summary.withVarianceCount += 1;
    }

    const statusRow =
      statusMap.get(row.status) ??
      ({ status: row.status, count: 0, systemTotal: 0, declaredTotal: 0 } as SettlementStatusRow);
    statusRow.count += 1;
    statusRow.systemTotal += systemTotal;
    statusRow.declaredTotal += declaredTotal;
    statusMap.set(row.status, statusRow);

    const partner =
      partnerMap.get(row.resellerId) ??
      ({
        resellerId: row.resellerId,
        code: row.reseller.code,
        name: row.reseller.name,
        settlementCount: 0,
        systemTotal: 0,
        varianceTotal: 0,
        openCount: 0,
      } as SettlementPartnerRow);
    partner.settlementCount += 1;
    partner.systemTotal += systemTotal;
    if (serialized.variance != null) partner.varianceTotal += variance;
    if (isOpenStatus(row.status)) partner.openCount += 1;
    partnerMap.set(row.resellerId, partner);

    const site =
      siteMap.get(row.stationId) ??
      ({
        stationId: row.stationId,
        code: row.station.code,
        name: row.station.name,
        settlementCount: 0,
        systemTotal: 0,
        varianceTotal: 0,
        openCount: 0,
      } as SettlementSiteRow);
    site.settlementCount += 1;
    site.systemTotal += systemTotal;
    if (serialized.variance != null) site.varianceTotal += variance;
    if (isOpenStatus(row.status)) site.openCount += 1;
    siteMap.set(row.stationId, site);

    const dayKey = utcDayKey(row.periodStart);
    const day = dailyMap.get(dayKey) ?? { settlementCount: 0, systemTotal: 0, varianceTotal: 0 };
    day.settlementCount += 1;
    day.systemTotal += systemTotal;
    if (serialized.variance != null) day.varianceTotal += variance;
    dailyMap.set(dayKey, day);
  }

  summary.systemTotal = Math.round(summary.systemTotal * 100) / 100;
  summary.declaredTotal = Math.round(summary.declaredTotal * 100) / 100;
  summary.varianceTotal = Math.round(summary.varianceTotal * 100) / 100;

  const dailyTrend: SettlementDailyPoint[] = [];
  for (const cursor of eachAppDay(periodFrom, periodTo)) {
    const key = utcDayKey(cursor);
    const day = dailyMap.get(key) ?? { settlementCount: 0, systemTotal: 0, varianceTotal: 0 };
    dailyTrend.push({ date: key, ...day });
  }

  return {
    summary,
    previousSummary: emptySummary(),
    byStatus: [...statusMap.values()].sort((a, b) => b.count - a.count),
    byPartner: [...partnerMap.values()].sort((a, b) => b.systemTotal - a.systemTotal),
    bySite: [...siteMap.values()].sort((a, b) => b.systemTotal - a.systemTotal),
    dailyTrend,
    settlements: settlements.sort(
      (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
    ),
  };
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return resolvePeriodFromPresetDays(days, periodTo);
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  return previousAppPeriod(periodFrom, periodTo);
}

export async function buildSettlementAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: SettlementFilters
): Promise<SettlementAnalyticsPayload> {
  const where = buildWhere(orgId, periodFrom, periodTo, filters);
  const rows = await prisma.rptFinSettlement.findMany({
    where,
    select: settlementSelect,
    orderBy: { periodStart: 'desc' },
  });

  const current = aggregateSettlements(rows, periodFrom, periodTo);

  const prev = previousPeriod(periodFrom, periodTo);
  const prevRows = await prisma.rptFinSettlement.findMany({
    where: buildWhere(orgId, prev.from, prev.to, filters),
    select: settlementSelect,
  });
  const previous = aggregateSettlements(prevRows, prev.from, prev.to);

  return {
    ...current,
    previousSummary: previous.summary,
  };
}

export async function loadSettlementDetail(
  prisma: PrismaClient,
  orgId: string,
  settlementId: string
): Promise<SettlementDetail | null> {
  const row = await prisma.rptFinSettlement.findFirst({
    where: { id: settlementId, orgId, deletedAt: null },
    select: {
      ...settlementSelect,
      lines: {
        select: {
          paymentMethod: true,
          systemAmount: true,
          systemPaymentsCount: true,
          systemOrdersCount: true,
          declaredAmount: true,
          varianceAmount: true,
        },
        orderBy: { paymentMethod: 'asc' },
      },
      _count: { select: { events: true } },
    },
  });

  if (!row) return null;

  const base = serializeSettlement(row);
  const lines: SettlementLineRow[] = row.lines.map((line) => ({
    paymentMethod: line.paymentMethod,
    systemAmount: decimalToNumber(line.systemAmount),
    systemPaymentsCount: line.systemPaymentsCount,
    systemOrdersCount: line.systemOrdersCount,
    declaredAmount: line.declaredAmount != null ? decimalToNumber(line.declaredAmount) : null,
    varianceAmount: line.varianceAmount != null ? decimalToNumber(line.varianceAmount) : null,
  }));

  return {
    ...base,
    lines,
    attestationCount: row._count.events,
  };
}
