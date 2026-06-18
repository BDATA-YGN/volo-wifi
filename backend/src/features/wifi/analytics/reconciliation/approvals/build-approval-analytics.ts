import { Prisma, PrismaClient } from '@/generated/prisma/client';

export type ApprovalSummary = {
  settlementCount: number;
  pendingStationCount: number;
  pendingOrgCount: number;
  readyToPostCount: number;
  postedCount: number;
  rejectedCount: number;
  attestationsSigned: number;
  stationAttestationsSigned: number;
  orgAttestationsSigned: number;
  postingsSealed: number;
};

export type ApprovalWorkflowRow = {
  status: string;
  count: number;
};

export type ApprovalAttestationKindRow = {
  kind: string;
  signedCount: number;
  pendingCount: number;
};

export type ApprovalDailyPoint = {
  date: string;
  attestationsSigned: number;
  postingsSealed: number;
};

export type ApprovalQueueRow = {
  settlementId: string;
  status: string;
  nextAction: string;
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
  variance: number | null;
  stationAttested: boolean;
  orgAttested: boolean;
  hasPosting: boolean;
  updatedAt: string;
};

export type AttestationEventRow = {
  attestationId: string;
  settlementId: string;
  kind: string;
  roleName: string | null;
  actorId: string | null;
  signedAt: string | null;
  note: string | null;
  resellerCode: string;
  stationCode: string;
  settlementStatus: string;
  periodStart: string;
};

export type PostingEventRow = {
  postingId: string;
  settlementId: string;
  kind: string;
  postedAt: string;
  postedBy: string | null;
  sealed: boolean;
  payloadHash: string;
  resellerCode: string;
  stationCode: string;
  settlementStatus: string;
  systemTotal: number;
  systemCurrency: string;
};

export type ApprovalTimelineItem = {
  id: string;
  type: 'attestation' | 'posting';
  kind: string;
  label: string;
  at: string;
  actorId: string | null;
  note: string | null;
  sealed?: boolean;
};

export type ApprovalDetail = {
  settlementId: string;
  status: string;
  nextAction: string;
  periodStart: string;
  periodEnd: string;
  resellerCode: string;
  resellerName: string;
  stationCode: string;
  stationName: string;
  systemCurrency: string;
  systemTotal: number;
  declaredTotal: number | null;
  variance: number | null;
  stationAttested: boolean;
  orgAttested: boolean;
  hasPosting: boolean;
  timeline: ApprovalTimelineItem[];
};

export type ApprovalAnalyticsPayload = {
  summary: ApprovalSummary;
  previousSummary: ApprovalSummary;
  byWorkflow: ApprovalWorkflowRow[];
  byAttestationKind: ApprovalAttestationKindRow[];
  dailyTrend: ApprovalDailyPoint[];
  approvalQueue: ApprovalQueueRow[];
  attestations: AttestationEventRow[];
  postings: PostingEventRow[];
};

type ApprovalFilters = {
  stationId?: string;
  resellerId?: string;
  status?: string;
};

const settlementContextSelect = {
  id: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  systemCurrency: true,
  systemTotal: true,
  declaredTotal: true,
  updatedAt: true,
  resellerId: true,
  stationId: true,
  reseller: { select: { code: true, name: true } },
  station: { select: { code: true, name: true } },
  posting: { select: { id: true } },
  events: {
    select: {
      id: true,
      kind: true,
      roleName: true,
      actorId: true,
      signedAt: true,
      note: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RptFinSettlementSelect;

type SettlementContext = Prisma.RptFinSettlementGetPayload<{
  select: typeof settlementContextSelect;
}>;

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptySummary(): ApprovalSummary {
  return {
    settlementCount: 0,
    pendingStationCount: 0,
    pendingOrgCount: 0,
    readyToPostCount: 0,
    postedCount: 0,
    rejectedCount: 0,
    attestationsSigned: 0,
    stationAttestationsSigned: 0,
    orgAttestationsSigned: 0,
    postingsSealed: 0,
  };
}

function settlementVariance(
  systemTotal: Prisma.Decimal,
  declaredTotal: Prisma.Decimal | null
): number | null {
  if (declaredTotal == null) return null;
  return Math.round((decimalToNumber(declaredTotal) - decimalToNumber(systemTotal)) * 100) / 100;
}

function hasSignedAttestation(
  events: SettlementContext['events'],
  kind: 'STATION' | 'ORGANIZATION'
): boolean {
  return events.some((e) => e.kind === kind && e.signedAt != null);
}

function nextActionForStatus(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Awaiting partner declaration';
    case 'DECLARED':
      return 'Awaiting station attestation';
    case 'STATION_ATTESTED':
      return 'Awaiting org approval';
    case 'ORG_APPROVED':
      return 'Ready to post';
    case 'POSTED':
      return 'Posted';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

function buildWhere(
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: ApprovalFilters
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

function serializeQueueRow(row: SettlementContext): ApprovalQueueRow {
  const stationAttested = hasSignedAttestation(row.events, 'STATION');
  const orgAttested = hasSignedAttestation(row.events, 'ORGANIZATION');
  return {
    settlementId: row.id,
    status: row.status,
    nextAction: nextActionForStatus(row.status),
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
    variance: settlementVariance(row.systemTotal, row.declaredTotal),
    stationAttested,
    orgAttested,
    hasPosting: Boolean(row.posting),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function aggregateApprovals(
  settlements: SettlementContext[],
  postings: PostingEventRow[],
  periodFrom: Date,
  periodTo: Date
): ApprovalAnalyticsPayload {
  const summary = emptySummary();
  const workflowMap = new Map<string, number>();
  const kindSigned = { STATION: 0, ORGANIZATION: 0 };
  const kindPending = { STATION: 0, ORGANIZATION: 0 };
  const dailyMap = new Map<string, { attestationsSigned: number; postingsSealed: number }>();
  const attestations: AttestationEventRow[] = [];
  const approvalQueue: ApprovalQueueRow[] = [];

  for (const row of settlements) {
    summary.settlementCount += 1;
    workflowMap.set(row.status, (workflowMap.get(row.status) ?? 0) + 1);

    if (row.status === 'DECLARED') summary.pendingStationCount += 1;
    if (row.status === 'STATION_ATTESTED') summary.pendingOrgCount += 1;
    if (row.status === 'ORG_APPROVED') summary.readyToPostCount += 1;
    if (row.status === 'POSTED') summary.postedCount += 1;
    if (row.status === 'REJECTED') summary.rejectedCount += 1;

    const queueRow = serializeQueueRow(row);
    if (['DECLARED', 'STATION_ATTESTED', 'ORG_APPROVED'].includes(row.status)) {
      approvalQueue.push(queueRow);
    }

    for (const event of row.events) {
      const isStation = event.kind === 'STATION';
      const isOrg = event.kind === 'ORGANIZATION';
      if (event.signedAt) {
        if (isStation) kindSigned.STATION += 1;
        if (isOrg) kindSigned.ORGANIZATION += 1;

        if (event.signedAt >= periodFrom && event.signedAt <= periodTo) {
          summary.attestationsSigned += 1;
          if (isStation) summary.stationAttestationsSigned += 1;
          if (isOrg) summary.orgAttestationsSigned += 1;

          const dayKey = utcDayKey(event.signedAt);
          const day = dailyMap.get(dayKey) ?? { attestationsSigned: 0, postingsSealed: 0 };
          day.attestationsSigned += 1;
          dailyMap.set(dayKey, day);
        }
      } else {
        if (isStation) kindPending.STATION += 1;
        if (isOrg) kindPending.ORGANIZATION += 1;
      }

      attestations.push({
        attestationId: event.id,
        settlementId: row.id,
        kind: event.kind,
        roleName: event.roleName,
        actorId: event.actorId,
        signedAt: event.signedAt?.toISOString() ?? null,
        note: event.note,
        resellerCode: row.reseller.code,
        stationCode: row.station.code,
        settlementStatus: row.status,
        periodStart: row.periodStart.toISOString(),
      });
    }
  }

  for (const posting of postings) {
    summary.postingsSealed += 1;
    const postedAt = new Date(posting.postedAt);
    if (postedAt >= periodFrom && postedAt <= periodTo) {
      const dayKey = utcDayKey(postedAt);
      const day = dailyMap.get(dayKey) ?? { attestationsSigned: 0, postingsSealed: 0 };
      day.postingsSealed += 1;
      dailyMap.set(dayKey, day);
    }
  }

  const dailyTrend: ApprovalDailyPoint[] = [];
  const cursor = new Date(periodFrom);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodTo);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = utcDayKey(cursor);
    const day = dailyMap.get(key) ?? { attestationsSigned: 0, postingsSealed: 0 };
    dailyTrend.push({ date: key, ...day });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    summary,
    previousSummary: emptySummary(),
    byWorkflow: [...workflowMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    byAttestationKind: [
      { kind: 'STATION', signedCount: kindSigned.STATION, pendingCount: kindPending.STATION },
      {
        kind: 'ORGANIZATION',
        signedCount: kindSigned.ORGANIZATION,
        pendingCount: kindPending.ORGANIZATION,
      },
    ],
    dailyTrend,
    approvalQueue: approvalQueue.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    attestations: attestations.sort((a, b) => {
      const aTime = a.signedAt ? new Date(a.signedAt).getTime() : 0;
      const bTime = b.signedAt ? new Date(b.signedAt).getTime() : 0;
      return bTime - aTime;
    }),
    postings: postings.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()),
  };
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const end = new Date(periodTo);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { periodFrom: start, periodTo: end };
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  const ms = periodTo.getTime() - periodFrom.getTime();
  const to = new Date(periodFrom.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

async function loadPostingsForSettlements(
  prisma: PrismaClient,
  settlementIds: string[]
): Promise<PostingEventRow[]> {
  if (settlementIds.length === 0) return [];

  const rows = await prisma.rptFinPosting.findMany({
    where: { settlementId: { in: settlementIds } },
    select: {
      id: true,
      settlementId: true,
      kind: true,
      postedAt: true,
      postedBy: true,
      sealed: true,
      payloadHash: true,
      settlement: {
        select: {
          status: true,
          systemCurrency: true,
          systemTotal: true,
          reseller: { select: { code: true } },
          station: { select: { code: true } },
        },
      },
    },
    orderBy: { postedAt: 'desc' },
  });

  return rows.map((row) => ({
    postingId: row.id,
    settlementId: row.settlementId,
    kind: row.kind,
    postedAt: row.postedAt.toISOString(),
    postedBy: row.postedBy,
    sealed: row.sealed,
    payloadHash: row.payloadHash,
    resellerCode: row.settlement.reseller.code,
    stationCode: row.settlement.station.code,
    settlementStatus: row.settlement.status,
    systemTotal: decimalToNumber(row.settlement.systemTotal),
    systemCurrency: row.settlement.systemCurrency,
  }));
}

export async function buildApprovalAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: ApprovalFilters
): Promise<ApprovalAnalyticsPayload> {
  const where = buildWhere(orgId, periodFrom, periodTo, filters);
  const settlements = await prisma.rptFinSettlement.findMany({
    where,
    select: settlementContextSelect,
    orderBy: { updatedAt: 'desc' },
  });

  const settlementIds = settlements.map((s) => s.id);
  const postings = await loadPostingsForSettlements(prisma, settlementIds);

  const current = aggregateApprovals(settlements, postings, periodFrom, periodTo);

  const prev = previousPeriod(periodFrom, periodTo);
  const prevSettlements = await prisma.rptFinSettlement.findMany({
    where: buildWhere(orgId, prev.from, prev.to, filters),
    select: settlementContextSelect,
  });
  const prevPostings = await loadPostingsForSettlements(
    prisma,
    prevSettlements.map((s) => s.id)
  );
  const previous = aggregateApprovals(prevSettlements, prevPostings, prev.from, prev.to);

  return {
    ...current,
    previousSummary: previous.summary,
  };
}

export async function loadApprovalDetail(
  prisma: PrismaClient,
  orgId: string,
  settlementId: string
): Promise<ApprovalDetail | null> {
  const row = await prisma.rptFinSettlement.findFirst({
    where: { id: settlementId, orgId, deletedAt: null },
    select: {
      ...settlementContextSelect,
      posting: {
        select: {
          id: true,
          kind: true,
          postedAt: true,
          postedBy: true,
          sealed: true,
        },
      },
    },
  });

  if (!row) return null;

  const stationAttested = hasSignedAttestation(row.events, 'STATION');
  const orgAttested = hasSignedAttestation(row.events, 'ORGANIZATION');

  const timeline: ApprovalTimelineItem[] = row.events.map((event) => ({
    id: event.id,
    type: 'attestation' as const,
    kind: event.kind,
    label:
      event.kind === 'STATION'
        ? 'Station attestation'
        : event.kind === 'ORGANIZATION'
          ? 'Organization approval'
          : event.kind,
    at: (event.signedAt ?? event.createdAt).toISOString(),
    actorId: event.actorId,
    note: event.note,
  }));

  if (row.posting) {
    timeline.push({
      id: row.posting.id,
      type: 'posting',
      kind: row.posting.kind,
      label: 'Sealed posting',
      at: row.posting.postedAt.toISOString(),
      actorId: row.posting.postedBy,
      note: null,
      sealed: row.posting.sealed,
    });
  }

  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    settlementId: row.id,
    status: row.status,
    nextAction: nextActionForStatus(row.status),
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    resellerCode: row.reseller.code,
    resellerName: row.reseller.name,
    stationCode: row.station.code,
    stationName: row.station.name,
    systemCurrency: row.systemCurrency,
    systemTotal: decimalToNumber(row.systemTotal),
    declaredTotal: row.declaredTotal != null ? decimalToNumber(row.declaredTotal) : null,
    variance: settlementVariance(row.systemTotal, row.declaredTotal),
    stationAttested,
    orgAttested,
    hasPosting: Boolean(row.posting),
    timeline,
  };
}
