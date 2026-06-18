import type { CommissionType, Prisma } from '@/generated/prisma/client';

export type CommissionRuleRow = {
  resellerId: string | null;
  planId: string | null;
  type: CommissionType;
  value: Prisma.Decimal;
  isActive: boolean;
};

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function ruleSpecificity(
  rule: CommissionRuleRow,
  resellerId: string | null,
  planId: string
): number {
  const resellerMatch =
    rule.resellerId === null || (resellerId !== null && rule.resellerId === resellerId);
  const planMatch = rule.planId === null || rule.planId === planId;
  if (!resellerMatch || !planMatch) return 0;
  if (rule.resellerId && rule.planId) return 4;
  if (rule.resellerId) return 3;
  if (rule.planId) return 2;
  return 1;
}

function pickRule(
  rules: CommissionRuleRow[],
  resellerId: string | null,
  planId: string
): CommissionRuleRow | null {
  let best: CommissionRuleRow | null = null;
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

export function lineCommissionAmount(
  rule: CommissionRuleRow,
  lineTotal: Prisma.Decimal,
  qty: number
): number {
  const total = decimalToNumber(lineTotal);
  if (rule.type === 'PERCENT') {
    return Math.round(total * decimalToNumber(rule.value) * 100) / 100;
  }
  return Math.round(decimalToNumber(rule.value) * qty * 100) / 100;
}

export function commissionForLine(
  rules: CommissionRuleRow[],
  resellerId: string | null,
  planId: string,
  lineTotal: Prisma.Decimal,
  qty: number
): number {
  const rule = pickRule(rules, resellerId, planId);
  if (!rule) return 0;
  return lineCommissionAmount(rule, lineTotal, qty);
}
