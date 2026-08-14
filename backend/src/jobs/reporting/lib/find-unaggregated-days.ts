import type { PrismaClient } from '@/generated/prisma/client';
import { appDayKey, appDayBucket } from '@/utils/app-time';

type DayCount = { day: Date; n: number };

function toCountMap(rows: DayCount[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(appDayKey(row.day), Number(row.n) || 0);
  }
  return map;
}

/**
 * Calendar days in `[from, to]` that have live sales/sessions but missing or
 * far-behind daily stats. Used to catch up after a short lookback window.
 */
export async function findDaysNeedingRebuild(
  prisma: PrismaClient,
  from: Date,
  to: Date
): Promise<Date[]> {
  const [liveOrders, statOrders, liveSessions, statSessions] = await Promise.all([
    prisma.$queryRaw<DayCount[]>`
      SELECT (timezone('Asia/Yangon', sold_at))::date AS day, COUNT(*)::int AS n
      FROM wf_sale_order
      WHERE status = 'PAID'
        AND sold_at >= ${from}
        AND sold_at <= ${to}
      GROUP BY 1
    `,
    prisma.$queryRaw<DayCount[]>`
      SELECT (timezone('Asia/Yangon', date))::date AS day, COALESCE(SUM(orders_count), 0)::int AS n
      FROM rpt_daily_sales_stat
      WHERE deleted_at IS NULL
        AND date >= ${from}
        AND date <= ${to}
      GROUP BY 1
    `,
    prisma.$queryRaw<DayCount[]>`
      SELECT (timezone('Asia/Yangon', started_at))::date AS day, COUNT(*)::int AS n
      FROM wf_radius_session
      WHERE started_at >= ${from}
        AND started_at <= ${to}
      GROUP BY 1
    `,
    prisma.$queryRaw<DayCount[]>`
      SELECT (timezone('Asia/Yangon', date))::date AS day, COALESCE(SUM(sessions_count), 0)::int AS n
      FROM rpt_daily_radius_usage_stat
      WHERE deleted_at IS NULL
        AND date >= ${from}
        AND date <= ${to}
      GROUP BY 1
    `,
  ]);

  const liveOrderMap = toCountMap(liveOrders);
  const statOrderMap = toCountMap(statOrders);
  const liveSessionMap = toCountMap(liveSessions);
  const statSessionMap = toCountMap(statSessions);

  const keys = new Set([
    ...liveOrderMap.keys(),
    ...statOrderMap.keys(),
    ...liveSessionMap.keys(),
    ...statSessionMap.keys(),
  ]);

  const needed: Date[] = [];
  for (const key of keys) {
    const liveO = liveOrderMap.get(key) ?? 0;
    const statO = statOrderMap.get(key) ?? 0;
    const liveS = liveSessionMap.get(key) ?? 0;
    const statS = statSessionMap.get(key) ?? 0;

    const ordersBehind = liveO > 0 && (statO === 0 || (liveO - statO > 50 && statO / liveO < 0.95));
    const sessionsBehind = liveS > 0 && (statS === 0 || (liveS - statS > 50 && statS / liveS < 0.95));
    if (!ordersBehind && !sessionsBehind) continue;

    needed.push(appDayBucket(new Date(`${key}T12:00:00+06:30`)));
  }

  needed.sort((a, b) => a.getTime() - b.getTime());
  return needed;
}
