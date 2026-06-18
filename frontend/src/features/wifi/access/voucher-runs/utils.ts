export function redemptionPercent(issued: number, remaining: number): number {
  if (issued <= 0) return 0;
  const redeemed = Math.max(0, issued - remaining);
  return Math.round((redeemed / issued) * 100);
}

/** Cancel is only allowed before any voucher code has been sold from the run. */
export function canCancelVoucherRun(run: {
  canCancel?: boolean;
  issuedTokenCount?: number;
  remainingQuantity: number;
}): boolean {
  if (run.canCancel != null) return run.canCancel;
  return (run.issuedTokenCount ?? 0) === 0 && run.remainingQuantity > 0;
}
