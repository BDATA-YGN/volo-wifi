import { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { CommissionType } from '@/generated/prisma/client';

type RuleRow = {
  id: string;
  resellerId: string | null;
  planId: string | null;
  type: CommissionType;
  value: Prisma.Decimal;
  isActive: boolean;
};

type SaleItemRow = {
  id: string;
  planId: string;
  qty: number;
  lineTotal: Prisma.Decimal;
  plan: { code: string; name: string };
};

type SaleOrderRow = {
  id: string;
  orderNo: string;
  total: Prisma.Decimal;
  soldAt: Date | null;
  items: SaleItemRow[];
};

export type CommissionLine = {
  orderId: string;
  orderNo: string;
  planId: string;
  planCode: string;
  planName: string;
  qty: number;
  lineTotal: number;
  ruleType: CommissionType | null;
  ruleValue: number | null;
  commission: number;
};

export type CommissionPreview = {
  orderCount: number;
  itemCount: number;
  grossSales: number;
  commissionAmount: number;
  lines: CommissionLine[];
};

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function ruleSpecificity(rule: RuleRow, resellerId: string, planId: string): number {
  const resellerMatch = rule.resellerId === null || rule.resellerId === resellerId;
  const planMatch = rule.planId === null || rule.planId === planId;
  if (!resellerMatch || !planMatch) return 0;
  if (rule.resellerId && rule.planId) return 4;
  if (rule.resellerId) return 3;
  if (rule.planId) return 2;
  return 1;
}

function pickRule(rules: RuleRow[], resellerId: string, planId: string): RuleRow | null {
  let best: RuleRow | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const score = ruleSpecificity(rule, resellerId, planId);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  return best;
}

function lineCommission(rule: RuleRow, lineTotal: Prisma.Decimal, qty: number): number {
  const total = decimalToNumber(lineTotal);
  if (rule.type === 'PERCENT') {
    return Math.round(total * decimalToNumber(rule.value) * 100) / 100;
  }
  return Math.round(decimalToNumber(rule.value) * qty * 100) / 100;
}

export async function calculatePartnerCommission(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<CommissionPreview> {
  const [rules, orders] = await Promise.all([
    prisma.commissionRule.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: {
        id: true,
        resellerId: true,
        planId: true,
        type: true,
        value: true,
        isActive: true,
      },
    }),
    prisma.saleOrder.findMany({
      where: {
        orgId,
        resellerId,
        status: 'PAID',
        soldAt: { gte: periodFrom, lte: periodTo },
      },
      select: {
        id: true,
        orderNo: true,
        total: true,
        soldAt: true,
        items: {
          select: {
            id: true,
            planId: true,
            qty: true,
            lineTotal: true,
            plan: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { soldAt: 'asc' },
    }),
  ]);

  const lines: CommissionLine[] = [];
  let grossSales = 0;
  let commissionAmount = 0;
  let itemCount = 0;

  for (const order of orders as SaleOrderRow[]) {
    grossSales += decimalToNumber(order.total);
    for (const item of order.items) {
      itemCount += 1;
      const rule = pickRule(rules, resellerId, item.planId);
      const commission = rule ? lineCommission(rule, item.lineTotal, item.qty) : 0;
      commissionAmount += commission;
      lines.push({
        orderId: order.id,
        orderNo: order.orderNo,
        planId: item.planId,
        planCode: item.plan.code,
        planName: item.plan.name,
        qty: item.qty,
        lineTotal: decimalToNumber(item.lineTotal),
        ruleType: rule?.type ?? null,
        ruleValue: rule ? decimalToNumber(rule.value) : null,
        commission,
      });
    }
  }

  commissionAmount = Math.round(commissionAmount * 100) / 100;
  grossSales = Math.round(grossSales * 100) / 100;

  return {
    orderCount: orders.length,
    itemCount,
    grossSales,
    commissionAmount,
    lines,
  };
}

export async function findOverlappingPayout(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  periodFrom: Date,
  periodTo: Date,
  excludeId?: string
): Promise<boolean> {
  const overlapping = await prisma.commissionPayout.findFirst({
    where: {
      orgId,
      resellerId,
      status: { not: 'REJECTED' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ periodFrom: { lte: periodTo } }, { periodTo: { gte: periodFrom } }],
    },
    select: { id: true },
  });
  return Boolean(overlapping);
}
