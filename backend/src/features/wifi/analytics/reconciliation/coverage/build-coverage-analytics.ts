import { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { EligibilityStatus } from './constants';

export type CoverageSummary = {
  scopeCount: number;
  activePaymentScopes: number;
  sealedCount: number;
  gapCount: number;
  unsealedCount: number;
  noCoverageCount: number;
  purgeEligibleCount: number;
  avgGapDays: number;
  totalUncoveredPayments: number;
  earliestCoveredAt: string | null;
  latestCoveredAt: string | null;
};

export type CoverageEligibilityRow = {
  status: EligibilityStatus;
  count: number;
};

export type CoverageLagBucket = {
  bucket: string;
  count: number;
};

export type CoveragePartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  scopeCount: number;
  sealedCount: number;
  gapCount: number;
  avgGapDays: number;
};

export type CoverageSiteRow = {
  stationId: string;
  code: string;
  name: string;
  scopeCount: number;
  sealedCount: number;
  gapCount: number;
  avgGapDays: number;
};

export type CoverageScopeRow = {
  coverageId: string | null;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  maxCoveredPaidAt: string | null;
  lastPostingId: string | null;
  lastPostedAt: string | null;
  postingSealed: boolean | null;
  latestPaymentAt: string | null;
  paymentCount: number;
  uncoveredPaymentCount: number;
  gapDays: number;
  eligibility: EligibilityStatus;
  updatedAt: string | null;
};

export type UncoveredPaymentRow = {
  paymentId: string;
  paidAt: string;
  amount: number;
  method: string;
  orderNo: string | null;
};

export type CoverageDetail = {
  coverageId: string | null;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  maxCoveredPaidAt: string | null;
  lastPostingId: string | null;
  lastPostedAt: string | null;
  postedBy: string | null;
  postingSealed: boolean | null;
  payloadHash: string | null;
  latestPaymentAt: string | null;
  paymentCount: number;
  uncoveredPaymentCount: number;
  gapDays: number;
  eligibility: EligibilityStatus;
  updatedAt: string | null;
  createdAt: string | null;
  uncoveredPayments: UncoveredPaymentRow[];
};

export type CoverageAnalyticsPayload = {
  summary: CoverageSummary;
  byEligibility: CoverageEligibilityRow[];
  lagBuckets: CoverageLagBucket[];
  byPartner: CoveragePartnerRow[];
  bySite: CoverageSiteRow[];
  scopes: CoverageScopeRow[];
  generatedAt: string;
};

type CoverageFilters = {
  stationId?: string;
  resellerId?: string;
  eligibility?: EligibilityStatus;
};

type PaymentScopeAgg = {
  reseller_id: string;
  station_id: string;
  latest_paid_at: Date;
  payment_count: number;
};

type ScopeKey = string;

function scopeKey(resellerId: string, stationId: string): ScopeKey {
  return `${resellerId}:${stationId}`;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function gapDaysBetween(coveredAt: Date | null, latestPaidAt: Date | null): number {
  if (!coveredAt || !latestPaidAt) return 0;
  if (latestPaidAt <= coveredAt) return 0;
  return Math.floor((latestPaidAt.getTime() - coveredAt.getTime()) / 86_400_000);
}

function resolveEligibility(input: {
  hasCoverage: boolean;
  lastPostingId: string | null;
  maxCoveredPaidAt: Date | null;
  latestPaymentAt: Date | null;
}): EligibilityStatus {
  if (!input.hasCoverage) return 'NO_COVERAGE';
  if (!input.lastPostingId) return 'UNSEALED';
  if (input.latestPaymentAt && input.maxCoveredPaidAt && input.latestPaymentAt > input.maxCoveredPaidAt) {
    return 'GAP';
  }
  return 'SEALED';
}

function lagBucketForDays(gapDays: number, eligibility: EligibilityStatus): string {
  if (eligibility === 'NO_COVERAGE') return 'No coverage record';
  if (eligibility === 'UNSEALED') return 'Unsealed posting';
  if (gapDays === 0) return 'Fully sealed';
  if (gapDays <= 7) return '1–7 day gap';
  if (gapDays <= 30) return '8–30 day gap';
  if (gapDays <= 90) return '31–90 day gap';
  return '90+ day gap';
}

function emptySummary(): CoverageSummary {
  return {
    scopeCount: 0,
    activePaymentScopes: 0,
    sealedCount: 0,
    gapCount: 0,
    unsealedCount: 0,
    noCoverageCount: 0,
    purgeEligibleCount: 0,
    avgGapDays: 0,
    totalUncoveredPayments: 0,
    earliestCoveredAt: null,
    latestCoveredAt: null,
  };
}

async function loadPaymentScopeAggregates(
  prisma: PrismaClient,
  orgId: string
): Promise<Map<ScopeKey, { latestPaidAt: Date; paymentCount: number }>> {
  const rows = await prisma.$queryRaw<PaymentScopeAgg[]>`
    SELECT
      o.reseller_id,
      o.station_id,
      MAX(p.paid_at) AS latest_paid_at,
      COUNT(p.id)::int AS payment_count
    FROM wf_payment p
    INNER JOIN wf_sale_order o ON o.id = p.order_id
    WHERE p.org_id = ${orgId}
      AND o.reseller_id IS NOT NULL
      AND o.station_id IS NOT NULL
    GROUP BY o.reseller_id, o.station_id
  `;

  const map = new Map<ScopeKey, { latestPaidAt: Date; paymentCount: number }>();
  for (const row of rows) {
    map.set(scopeKey(row.reseller_id, row.station_id), {
      latestPaidAt: row.latest_paid_at,
      paymentCount: row.payment_count,
    });
  }
  return map;
}

async function countUncoveredPayments(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  stationId: string,
  maxCoveredPaidAt: Date
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(p.id)::int AS count
    FROM wf_payment p
    INNER JOIN wf_sale_order o ON o.id = p.order_id
    WHERE p.org_id = ${orgId}
      AND o.reseller_id = ${resellerId}
      AND o.station_id = ${stationId}
      AND p.paid_at > ${maxCoveredPaidAt}
  `;
  return result[0]?.count ?? 0;
}

const coverageSelect = {
  id: true,
  orgId: true,
  resellerId: true,
  stationId: true,
  maxCoveredPaidAt: true,
  lastPostingId: true,
  updatedAt: true,
  createdAt: true,
  reseller: { select: { code: true, name: true } },
  station: { select: { code: true, name: true } },
} satisfies Prisma.RptFinSourceCoverageSelect;

type CoverageRecord = Prisma.RptFinSourceCoverageGetPayload<{ select: typeof coverageSelect }>;

async function loadPostingMap(
  prisma: PrismaClient,
  postingIds: string[]
): Promise<
  Map<
    string,
    { postedAt: Date; postedBy: string | null; sealed: boolean; payloadHash: string }
  >
> {
  if (postingIds.length === 0) return new Map();

  const postings = await prisma.rptFinPosting.findMany({
    where: { id: { in: postingIds } },
    select: {
      id: true,
      postedAt: true,
      postedBy: true,
      sealed: true,
      payloadHash: true,
    },
  });

  return new Map(
    postings.map((p) => [
      p.id,
      {
        postedAt: p.postedAt,
        postedBy: p.postedBy,
        sealed: p.sealed,
        payloadHash: p.payloadHash,
      },
    ])
  );
}

function buildScopeRow(
  input: {
    coverage: CoverageRecord | null;
    resellerId: string;
    resellerCode: string;
    resellerName: string;
    stationId: string;
    stationCode: string;
    stationName: string;
    paymentAgg: { latestPaidAt: Date; paymentCount: number } | undefined;
    posting: { postedAt: Date; sealed: boolean } | null;
    uncoveredPaymentCount: number;
  }
): CoverageScopeRow {
  const maxCoveredPaidAt = input.coverage?.maxCoveredPaidAt ?? null;
  const latestPaymentAt = input.paymentAgg?.latestPaidAt ?? null;
  const gapDays = gapDaysBetween(maxCoveredPaidAt, latestPaymentAt);
  const eligibility = resolveEligibility({
    hasCoverage: Boolean(input.coverage),
    lastPostingId: input.coverage?.lastPostingId ?? null,
    maxCoveredPaidAt,
    latestPaymentAt,
  });

  return {
    coverageId: input.coverage?.id ?? null,
    resellerId: input.resellerId,
    resellerCode: input.resellerCode,
    resellerName: input.resellerName,
    stationId: input.stationId,
    stationCode: input.stationCode,
    stationName: input.stationName,
    maxCoveredPaidAt: maxCoveredPaidAt?.toISOString() ?? null,
    lastPostingId: input.coverage?.lastPostingId ?? null,
    lastPostedAt: input.posting?.postedAt.toISOString() ?? null,
    postingSealed: input.posting?.sealed ?? null,
    latestPaymentAt: latestPaymentAt?.toISOString() ?? null,
    paymentCount: input.paymentAgg?.paymentCount ?? 0,
    uncoveredPaymentCount: input.uncoveredPaymentCount,
    gapDays,
    eligibility,
    updatedAt: input.coverage?.updatedAt.toISOString() ?? null,
  };
}

export async function buildCoverageAnalytics(
  prisma: PrismaClient,
  orgId: string,
  filters?: CoverageFilters
): Promise<CoverageAnalyticsPayload> {
  const where: Prisma.RptFinSourceCoverageWhereInput = {
    orgId,
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId ? { resellerId: filters.resellerId } : {}),
  };

  const [coverageRows, paymentScopes] = await Promise.all([
    prisma.rptFinSourceCoverage.findMany({
      where,
      select: coverageSelect,
      orderBy: { maxCoveredPaidAt: 'desc' },
    }),
    loadPaymentScopeAggregates(prisma, orgId),
  ]);

  const postingIds = [
    ...new Set(coverageRows.map((r) => r.lastPostingId).filter((id): id is string => Boolean(id))),
  ];
  const postingMap = await loadPostingMap(prisma, postingIds);

  const coveredKeys = new Set<string>();
  const scopeRows: CoverageScopeRow[] = [];

  for (const row of coverageRows) {
    const key = scopeKey(row.resellerId, row.stationId);
    coveredKeys.add(key);
    const paymentAgg = paymentScopes.get(key);
    const posting = row.lastPostingId ? postingMap.get(row.lastPostingId) ?? null : null;
    const uncoveredPaymentCount =
      paymentAgg && row.maxCoveredPaidAt
        ? await countUncoveredPayments(
            prisma,
            orgId,
            row.resellerId,
            row.stationId,
            row.maxCoveredPaidAt
          )
        : 0;

    scopeRows.push(
      buildScopeRow({
        coverage: row,
        resellerId: row.resellerId,
        resellerCode: row.reseller.code,
        resellerName: row.reseller.name,
        stationId: row.stationId,
        stationCode: row.station.code,
        stationName: row.station.name,
        paymentAgg,
        posting,
        uncoveredPaymentCount,
      })
    );
  }

  // Partner-site combos with payments but no coverage record
  if (!filters?.eligibility || filters.eligibility === 'NO_COVERAGE') {
    const missingKeys = [...paymentScopes.keys()].filter((key) => !coveredKeys.has(key));
    const missingIds = missingKeys.map((key) => {
      const [resellerId, stationId] = key.split(':');
      return { resellerId, stationId };
    });

    if (missingIds.length > 0) {
      const [resellers, stations] = await Promise.all([
        prisma.reseller.findMany({
          where: { orgId, id: { in: [...new Set(missingIds.map((m) => m.resellerId))] } },
          select: { id: true, code: true, name: true },
        }),
        prisma.wifiStation.findMany({
          where: { orgId, id: { in: [...new Set(missingIds.map((m) => m.stationId))] } },
          select: { id: true, code: true, name: true },
        }),
      ]);

      const resellerMap = new Map(resellers.map((r) => [r.id, r]));
      const stationMap = new Map(stations.map((s) => [s.id, s]));

      for (const { resellerId, stationId } of missingIds) {
        if (filters?.stationId && filters.stationId !== stationId) continue;
        if (filters?.resellerId && filters.resellerId !== resellerId) continue;

        const reseller = resellerMap.get(resellerId);
        const station = stationMap.get(stationId);
        if (!reseller || !station) continue;

        const paymentAgg = paymentScopes.get(scopeKey(resellerId, stationId));
        scopeRows.push(
          buildScopeRow({
            coverage: null,
            resellerId,
            resellerCode: reseller.code,
            resellerName: reseller.name,
            stationId,
            stationCode: station.code,
            stationName: station.name,
            paymentAgg,
            posting: null,
            uncoveredPaymentCount: paymentAgg?.paymentCount ?? 0,
          })
        );
      }
    }
  }

  const filteredScopes = filters?.eligibility
    ? scopeRows.filter((row) => row.eligibility === filters.eligibility)
    : scopeRows;

  const summary = emptySummary();
  const eligibilityMap = new Map<EligibilityStatus, number>();
  const lagMap = new Map<string, number>();
  const partnerMap = new Map<string, CoveragePartnerRow>();
  const siteMap = new Map<string, CoverageSiteRow>();
  let gapDaysTotal = 0;
  let gapScopeCount = 0;
  const coveredDates: Date[] = [];

  summary.activePaymentScopes = paymentScopes.size;

  for (const row of filteredScopes) {
    summary.scopeCount += 1;
    eligibilityMap.set(row.eligibility, (eligibilityMap.get(row.eligibility) ?? 0) + 1);

    if (row.eligibility === 'SEALED') summary.sealedCount += 1;
    if (row.eligibility === 'GAP') summary.gapCount += 1;
    if (row.eligibility === 'UNSEALED') summary.unsealedCount += 1;
    if (row.eligibility === 'NO_COVERAGE') summary.noCoverageCount += 1;
    if (row.eligibility === 'SEALED') summary.purgeEligibleCount += 1;

    summary.totalUncoveredPayments += row.uncoveredPaymentCount;

    if (row.gapDays > 0) {
      gapDaysTotal += row.gapDays;
      gapScopeCount += 1;
    }

    if (row.maxCoveredPaidAt) {
      coveredDates.push(new Date(row.maxCoveredPaidAt));
    }

    const lagLabel = lagBucketForDays(row.gapDays, row.eligibility);
    lagMap.set(lagLabel, (lagMap.get(lagLabel) ?? 0) + 1);

    const partner =
      partnerMap.get(row.resellerId) ??
      ({
        resellerId: row.resellerId,
        code: row.resellerCode,
        name: row.resellerName,
        scopeCount: 0,
        sealedCount: 0,
        gapCount: 0,
        avgGapDays: 0,
      } satisfies CoveragePartnerRow);
    partner.scopeCount += 1;
    if (row.eligibility === 'SEALED') partner.sealedCount += 1;
    if (row.eligibility === 'GAP') partner.gapCount += 1;
    partnerMap.set(row.resellerId, partner);

    const site =
      siteMap.get(row.stationId) ??
      ({
        stationId: row.stationId,
        code: row.stationCode,
        name: row.stationName,
        scopeCount: 0,
        sealedCount: 0,
        gapCount: 0,
        avgGapDays: 0,
      } satisfies CoverageSiteRow);
    site.scopeCount += 1;
    if (row.eligibility === 'SEALED') site.sealedCount += 1;
    if (row.eligibility === 'GAP') site.gapCount += 1;
    siteMap.set(row.stationId, site);
  }

  summary.avgGapDays =
    gapScopeCount > 0 ? Math.round((gapDaysTotal / gapScopeCount) * 10) / 10 : 0;

  if (coveredDates.length > 0) {
    coveredDates.sort((a, b) => a.getTime() - b.getTime());
    summary.earliestCoveredAt = coveredDates[0].toISOString();
    summary.latestCoveredAt = coveredDates[coveredDates.length - 1].toISOString();
  }

  for (const partner of partnerMap.values()) {
    const partnerScopes = filteredScopes.filter((s) => s.resellerId === partner.resellerId);
    const gaps = partnerScopes.filter((s) => s.gapDays > 0);
    partner.avgGapDays =
      gaps.length > 0
        ? Math.round((gaps.reduce((sum, s) => sum + s.gapDays, 0) / gaps.length) * 10) / 10
        : 0;
  }

  for (const site of siteMap.values()) {
    const siteScopes = filteredScopes.filter((s) => s.stationId === site.stationId);
    const gaps = siteScopes.filter((s) => s.gapDays > 0);
    site.avgGapDays =
      gaps.length > 0
        ? Math.round((gaps.reduce((sum, s) => sum + s.gapDays, 0) / gaps.length) * 10) / 10
        : 0;
  }

  const lagOrder = [
    'Fully sealed',
    '1–7 day gap',
    '8–30 day gap',
    '31–90 day gap',
    '90+ day gap',
    'Unsealed posting',
    'No coverage record',
  ];

  return {
    summary,
    byEligibility: [...eligibilityMap.entries()].map(([status, count]) => ({ status, count })),
    lagBuckets: [...lagMap.entries()]
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => lagOrder.indexOf(a.bucket) - lagOrder.indexOf(b.bucket)),
    byPartner: [...partnerMap.values()].sort((a, b) => b.gapCount - a.gapCount || b.scopeCount - a.scopeCount),
    bySite: [...siteMap.values()].sort((a, b) => b.gapCount - a.gapCount || b.scopeCount - a.scopeCount),
    scopes: filteredScopes.sort((a, b) => {
      const priority: Record<EligibilityStatus, number> = {
        GAP: 0,
        NO_COVERAGE: 1,
        UNSEALED: 2,
        SEALED: 3,
      };
      const pa = priority[a.eligibility];
      const pb = priority[b.eligibility];
      if (pa !== pb) return pa - pb;
      return b.gapDays - a.gapDays;
    }),
    generatedAt: new Date().toISOString(),
  };
}

export async function loadCoverageDetail(
  prisma: PrismaClient,
  orgId: string,
  coverageId: string
): Promise<CoverageDetail | null> {
  const row = await prisma.rptFinSourceCoverage.findFirst({
    where: { id: coverageId, orgId },
    select: {
      ...coverageSelect,
      lastPostingId: true,
    },
  });

  if (!row) return null;

  const paymentScopes = await loadPaymentScopeAggregates(prisma, orgId);
  const paymentAgg = paymentScopes.get(scopeKey(row.resellerId, row.stationId));

  const posting = row.lastPostingId
    ? await prisma.rptFinPosting.findUnique({
        where: { id: row.lastPostingId },
        select: {
          postedAt: true,
          postedBy: true,
          sealed: true,
          payloadHash: true,
        },
      })
    : null;

  const uncoveredPayments =
    row.maxCoveredPaidAt != null
      ? await prisma.payment.findMany({
          where: {
            orgId,
            paidAt: { gt: row.maxCoveredPaidAt },
            order: { resellerId: row.resellerId, stationId: row.stationId },
          },
          select: {
            id: true,
            paidAt: true,
            amount: true,
            method: true,
            order: { select: { orderNo: true } },
          },
          orderBy: { paidAt: 'desc' },
          take: 25,
        })
      : [];

  const uncoveredPaymentCount =
    row.maxCoveredPaidAt != null
      ? await countUncoveredPayments(
          prisma,
          orgId,
          row.resellerId,
          row.stationId,
          row.maxCoveredPaidAt
        )
      : paymentAgg?.paymentCount ?? 0;

  const latestPaymentAt = paymentAgg?.latestPaidAt ?? null;
  const gapDays = gapDaysBetween(row.maxCoveredPaidAt, latestPaymentAt);

  return {
    coverageId: row.id,
    resellerId: row.resellerId,
    resellerCode: row.reseller.code,
    resellerName: row.reseller.name,
    stationId: row.stationId,
    stationCode: row.station.code,
    stationName: row.station.name,
    maxCoveredPaidAt: row.maxCoveredPaidAt.toISOString(),
    lastPostingId: row.lastPostingId,
    lastPostedAt: posting?.postedAt.toISOString() ?? null,
    postedBy: posting?.postedBy ?? null,
    postingSealed: posting?.sealed ?? null,
    payloadHash: posting?.payloadHash ?? null,
    latestPaymentAt: latestPaymentAt?.toISOString() ?? null,
    paymentCount: paymentAgg?.paymentCount ?? 0,
    uncoveredPaymentCount,
    gapDays,
    eligibility: resolveEligibility({
      hasCoverage: true,
      lastPostingId: row.lastPostingId,
      maxCoveredPaidAt: row.maxCoveredPaidAt,
      latestPaymentAt,
    }),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    uncoveredPayments: uncoveredPayments.map((p) => ({
      paymentId: p.id,
      paidAt: p.paidAt.toISOString(),
      amount: decimalToNumber(p.amount),
      method: p.method,
      orderNo: p.order?.orderNo ?? null,
    })),
  };
}
