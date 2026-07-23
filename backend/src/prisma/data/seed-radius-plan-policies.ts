import type {
  PrismaClient,
  RadiusAttrPhase,
  RadiusAttrValueType,
} from '@/generated/prisma/client';
import { randomUUID } from 'crypto';

type PolicySeedRow = {
  attributeName: string;
  op?: string;
  valueType?: RadiusAttrValueType;
  value: string;
  priority?: number;
  phase?: RadiusAttrPhase;
  note?: string | null;
};

type PlanBrief = {
  id: string;
  code: string;
  name: string;
  timeAmount: number | null;
  timeUnit: string | null;
  dataMb: number | null;
};

type ProfileBrief = {
  id: string;
  name: string;
  vendor: string;
};

function timeSecondsHint(plan: PlanBrief): string {
  // Prefer policy-engine template; fall back to a fixed seconds value when amount is known.
  if (plan.timeAmount && plan.timeAmount > 0) {
    return '{timeSeconds}';
  }
  return '3600';
}

function dataBytes(plan: PlanBrief): number | null {
  if (plan.dataMb == null || plan.dataMb <= 0) return null;
  return plan.dataMb * 1024 * 1024;
}

function globalRulesForPlan(plan: PlanBrief, profile: ProfileBrief): PolicySeedRow[] {
  const rows: PolicySeedRow[] = [
    {
      attributeName: 'Session-Timeout',
      op: ':=',
      valueType: 'INTEGER',
      value: timeSecondsHint(plan),
      priority: 10,
      note: `Global session limit for ${plan.code} (${plan.name})`,
    },
    {
      attributeName: 'Idle-Timeout',
      op: ':=',
      valueType: 'INTEGER',
      value: '600',
      priority: 20,
      note: 'Disconnect after 10 minutes idle',
    },
    {
      attributeName: 'Acct-Interim-Interval',
      op: ':=',
      valueType: 'INTEGER',
      value: '300',
      priority: 30,
      note: 'Interim accounting every 5 minutes',
    },
  ];

  if (profile.vendor === 'MikroTik') {
    rows.push({
      attributeName: 'Mikrotik-Rate-Limit',
      op: ':=',
      valueType: 'STRING',
      value: plan.code.startsWith('P0') && plan.code !== 'P00' ? '2M/2M' : '1M/1M',
      priority: 40,
      note: `Global MikroTik rate for ${plan.code}`,
    });

    const bytes = dataBytes(plan);
    if (bytes != null) {
      rows.push({
        attributeName: 'Mikrotik-Total-Limit',
        op: ':=',
        valueType: 'INTEGER',
        value: String(bytes),
        priority: 50,
        note: `Global total quota ${plan.dataMb} MB for ${plan.code}`,
      });
    }
  }

  if (profile.vendor === 'Ruijie') {
    rows.push(
      {
        attributeName: 'WISPr-Bandwidth-Max-Down',
        op: ':=',
        valueType: 'INTEGER',
        value: '2000000',
        priority: 40,
        note: `Global WISPr download for ${plan.code}`,
      },
      {
        attributeName: 'WISPr-Bandwidth-Max-Up',
        op: ':=',
        valueType: 'INTEGER',
        value: '2000000',
        priority: 41,
        note: `Global WISPr upload for ${plan.code}`,
      }
    );
  }

  return rows;
}

function siteOverrideRules(
  plan: PlanBrief,
  profile: ProfileBrief,
  stationCode: string
): PolicySeedRow[] {
  const rows: PolicySeedRow[] = [
    {
      attributeName: 'Idle-Timeout',
      op: ':=',
      valueType: 'INTEGER',
      value: '300',
      priority: 15,
      note: `Site override on ${stationCode}: stricter idle timeout`,
    },
  ];

  if (profile.vendor === 'MikroTik') {
    rows.push({
      attributeName: 'Mikrotik-Rate-Limit',
      op: ':=',
      valueType: 'STRING',
      value: '512k/512k',
      priority: 35,
      note: `Site override on ${stationCode}: lower rate for ${plan.code}`,
    });
  }

  if (profile.vendor === 'Ruijie') {
    rows.push(
      {
        attributeName: 'WISPr-Bandwidth-Max-Down',
        op: ':=',
        valueType: 'INTEGER',
        value: '512000',
        priority: 35,
        note: `Site override on ${stationCode}: lower download for ${plan.code}`,
      },
      {
        attributeName: 'WISPr-Bandwidth-Max-Up',
        op: ':=',
        valueType: 'INTEGER',
        value: '512000',
        priority: 36,
        note: `Site override on ${stationCode}: lower upload for ${plan.code}`,
      }
    );
  }

  return rows;
}

async function upsertPolicy(
  prisma: PrismaClient,
  input: {
    orgId: string;
    planId: string;
    vendorProfileId: string;
    wifiStationId: string | null;
    policyBundleId: string;
    row: PolicySeedRow;
  }
): Promise<'created' | 'updated' | 'skipped'> {
  const phase = input.row.phase ?? 'REPLY';
  const existing = await prisma.planRadiusAttribute.findFirst({
    where: {
      orgId: input.orgId,
      planId: input.planId,
      vendorProfileId: input.vendorProfileId,
      wifiStationId: input.wifiStationId,
      attributeName: input.row.attributeName,
      phase,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    op: input.row.op ?? ':=',
    valueType: input.row.valueType ?? 'STRING',
    value: input.row.value,
    priority: input.row.priority ?? 100,
    note: input.row.note ?? null,
    policyBundleId: input.policyBundleId,
  };

  if (existing) {
    await prisma.planRadiusAttribute.update({
      where: { id: existing.id },
      data,
    });
    return 'updated';
  }

  await prisma.planRadiusAttribute.create({
    data: {
      orgId: input.orgId,
      planId: input.planId,
      vendorProfileId: input.vendorProfileId,
      wifiStationId: input.wifiStationId,
      policyBundleId: input.policyBundleId,
      phase,
      attributeName: input.row.attributeName,
      op: data.op,
      valueType: data.valueType as never,
      value: data.value,
      priority: data.priority,
      note: data.note,
    },
  });
  return 'created';
}

export type SeedPlanPoliciesResult = {
  orgId: string;
  orgCode: string;
  globalCreated: number;
  globalUpdated: number;
  siteCreated: number;
  siteUpdated: number;
  siteCodes: string[];
  planCodes: string[];
  profileNames: string[];
};

/**
 * Seed sample Plan RADIUS policies:
 * - Global (wifiStationId = null) for every active plan × vendor profile
 * - Site overrides for up to 2 stations (MikroTik site + Ruijie site when possible)
 */
export async function seedRadiusPlanPoliciesForOrg(
  prisma: PrismaClient,
  orgId: string,
  orgCode: string
): Promise<SeedPlanPoliciesResult> {
  const [plans, profiles, stations] = await Promise.all([
    prisma.plan.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        timeAmount: true,
        timeUnit: true,
        dataMb: true,
      },
      orderBy: { code: 'asc' },
    }),
    prisma.radiusVendorProfile.findMany({
      where: { orgId, deletedAt: null },
      select: { id: true, name: true, vendor: true },
      orderBy: { name: 'asc' },
    }),
    prisma.wifiStation.findMany({
      where: { orgId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
      take: 20,
    }),
  ]);

  if (!plans.length) {
    throw new Error(`Org ${orgCode} has no active plans to attach policies to.`);
  }
  if (!profiles.length) {
    throw new Error(
      `Org ${orgCode} has no vendor profiles. Run yarn data:radius:seed-vendors -- --org=${orgCode} first.`
    );
  }

  let globalCreated = 0;
  let globalUpdated = 0;
  let siteCreated = 0;
  let siteUpdated = 0;

  for (const plan of plans) {
    for (const profile of profiles) {
      const bundleId =
        (
          await prisma.planRadiusAttribute.findFirst({
            where: {
              orgId,
              planId: plan.id,
              vendorProfileId: profile.id,
              wifiStationId: null,
              deletedAt: null,
            },
            select: { policyBundleId: true },
          })
        )?.policyBundleId ?? randomUUID();

      for (const row of globalRulesForPlan(plan, profile)) {
        const result = await upsertPolicy(prisma, {
          orgId,
          planId: plan.id,
          vendorProfileId: profile.id,
          wifiStationId: null,
          policyBundleId: bundleId,
          row,
        });
        if (result === 'created') globalCreated += 1;
        if (result === 'updated') globalUpdated += 1;
      }
    }
  }

  // Prefer one MikroTik-ish site + one other site for site-scoped demos.
  const mikrotik = profiles.find((p) => p.vendor === 'MikroTik') ?? profiles[0]!;
  const ruijie = profiles.find((p) => p.vendor === 'Ruijie') ?? profiles[profiles.length - 1]!;
  const demoPlan =
    plans.find((p) => p.code === 'P01') ??
    plans.find((p) => p.code === 'PLNA94') ??
    plans[0]!;

  const siteA = stations[0] ?? null;
  const siteB = stations.find((s) => s.id !== siteA?.id) ?? null;
  const siteCodes: string[] = [];

  if (siteA) {
    siteCodes.push(siteA.code);
    const bundleId =
      (
        await prisma.planRadiusAttribute.findFirst({
          where: {
            orgId,
            planId: demoPlan.id,
            vendorProfileId: mikrotik.id,
            wifiStationId: siteA.id,
            deletedAt: null,
          },
          select: { policyBundleId: true },
        })
      )?.policyBundleId ?? randomUUID();

    for (const row of siteOverrideRules(demoPlan, mikrotik, siteA.code)) {
      const result = await upsertPolicy(prisma, {
        orgId,
        planId: demoPlan.id,
        vendorProfileId: mikrotik.id,
        wifiStationId: siteA.id,
        policyBundleId: bundleId,
        row,
      });
      if (result === 'created') siteCreated += 1;
      if (result === 'updated') siteUpdated += 1;
    }
  }

  if (siteB) {
    siteCodes.push(siteB.code);
    const bundleId =
      (
        await prisma.planRadiusAttribute.findFirst({
          where: {
            orgId,
            planId: demoPlan.id,
            vendorProfileId: ruijie.id,
            wifiStationId: siteB.id,
            deletedAt: null,
          },
          select: { policyBundleId: true },
        })
      )?.policyBundleId ?? randomUUID();

    for (const row of siteOverrideRules(demoPlan, ruijie, siteB.code)) {
      const result = await upsertPolicy(prisma, {
        orgId,
        planId: demoPlan.id,
        vendorProfileId: ruijie.id,
        wifiStationId: siteB.id,
        policyBundleId: bundleId,
        row,
      });
      if (result === 'created') siteCreated += 1;
      if (result === 'updated') siteUpdated += 1;
    }
  }

  return {
    orgId,
    orgCode,
    globalCreated,
    globalUpdated,
    siteCreated,
    siteUpdated,
    siteCodes,
    planCodes: plans.map((p) => p.code),
    profileNames: profiles.map((p) => p.name),
  };
}
