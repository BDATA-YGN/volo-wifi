/** User-facing 409 conflict copy — explains scope (platform vs org) where it helps. */

/** Console `admin.username` is globally unique, not per-organization. */
export function consoleUsernameTakenMessage(username: string): string {
  return `Username "${username}" belongs to another console account. Login names are unique across the platform — choose a different username.`;
}

/** `Org.code` is globally unique. */
export function tenantCodeTakenMessage(code: string): string {
  return `Tenant code "${code}" is already assigned to another organization. Choose a different code.`;
}

export function orgTeamMemberExistsMessage(): string {
  return 'This console account is already a team member of this organization.';
}

/** Identifier unique within one tenant (site, plan, partner, voucher batch, …). */
export function orgScopedCodeTakenMessage(entityLabel: string, code: string): string {
  return `${entityLabel} "${code}" is already used by another record in this organization. Choose a different code.`;
}

/** Identifier unique platform-wide (capacity tier, catalog entry, …). */
export function platformCodeTakenMessage(entityLabel: string, code: string): string {
  return `${entityLabel} "${code}" is already used on the platform. Choose a different code.`;
}

export function orgScopedFreeradiusAttributeTakenMessage(name: string): string {
  return `FreeRADIUS attribute "${name}" is already in this organization's catalog. Use a different name or edit the existing entry.`;
}

/** @deprecated Use orgScopedFreeradiusAttributeTakenMessage */
export function freeradiusAttributeTakenMessage(name: string): string {
  return orgScopedFreeradiusAttributeTakenMessage(name);
}

export function voucherBatchTakenMessage(batchNo: string): string {
  return `Voucher batch "${batchNo}" already exists in this organization. Choose a different batch number.`;
}

export function commissionRuleScopeTakenMessage(): string {
  return 'A commission rule already covers this partner and plan combination in this organization.';
}

export function commissionPayoutPeriodOverlapMessage(): string {
  return 'A payout for this partner already covers part of this date range. Adjust the period or edit the existing payout.';
}

export function tenantTierRateOverrideTakenMessage(): string {
  return 'A rate override with the same effective date already exists for this tenant and capacity tier.';
}
