import type { PartnerStatus } from "./types";

const PARTNER_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateRandomPartnerCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += PARTNER_CODE_CHARS[Math.floor(Math.random() * PARTNER_CODE_CHARS.length)];
  }
  return code;
}

export function generateUniquePartnerCode(existingCodes: string[], length = 8): string {
  const taken = new Set(existingCodes.map((code) => code.trim().toUpperCase()));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = generateRandomPartnerCode(length);
    if (!taken.has(code)) {
      return code;
    }
  }
  throw new Error("Could not generate a unique partner code. Try again.");
}

export function formatStatusLabel(status: PartnerStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function buildPlanEntitlementsFromForm(
  plans: { id: string }[],
  enabledPlanIds: string[]
): { planId: string; isEnabled: boolean }[] {
  const enabled = new Set(enabledPlanIds);
  return plans.map((plan) => ({
    planId: plan.id,
    isEnabled: enabled.has(plan.id),
  }));
}

export function enabledPlanIdsFromEntitlements(
  entitlements: { planId: string; isEnabled: boolean }[]
): string[] {
  return entitlements.filter((e) => e.isEnabled).map((e) => e.planId);
}
