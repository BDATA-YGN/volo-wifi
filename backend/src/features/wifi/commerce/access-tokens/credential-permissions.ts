export type CredentialActions = {
  canRevoke: boolean;
  canPause: boolean;
  canUnlock: boolean;
  canRevertToSold: boolean;
  revokeBlockedReason?: string;
};

/** Revoke is only allowed before the token has been used (sold, not yet activated). */
const REVOKABLE = new Set(['SOLD']);
const PAUSABLE = new Set(['ACTIVATED']);
const UNLOCKABLE = new Set(['PAUSED']);
const REVERTABLE = new Set(['ACTIVATED', 'PAUSED']);

export type CredentialPermissionContext = {
  mode: 'partner' | 'preview';
  isDeveloper: boolean;
};

export function isRevokeWindowOpen(
  soldAt: Date | null | undefined,
  windowMinutes: number,
  now = new Date()
): boolean {
  if (windowMinutes <= 0) return true;
  if (!soldAt) return true;
  return now.getTime() - soldAt.getTime() <= windowMinutes * 60 * 1000;
}

export function resolveCredentialActions(
  ctx: CredentialPermissionContext,
  credential: { status: string; soldAt: Date | null | undefined },
  revokeWindowMinutes: number
): CredentialActions {
  const status = credential.status;
  const isOpsElevated = ctx.isDeveloper || ctx.mode === 'preview';
  const statusAllowsRevoke = REVOKABLE.has(status);
  const withinWindow = isRevokeWindowOpen(credential.soldAt, revokeWindowMinutes);

  // Elevated roles skip the post-sale time window; status rule still applies for everyone.
  const canRevoke = statusAllowsRevoke && (isOpsElevated || withinWindow);

  // Only surface a reason when status would allow revoke but the sale window blocks it.
  // Used tokens simply omit the Revoke action (no banner noise on every detail view).
  let revokeBlockedReason: string | undefined;
  if (statusAllowsRevoke && !canRevoke) {
    revokeBlockedReason = `Revoke is only allowed within ${revokeWindowMinutes} minutes after sale.`;
  }

  return {
    canRevoke,
    canPause: isOpsElevated && PAUSABLE.has(status),
    canUnlock: UNLOCKABLE.has(status),
    // Developer role only — not other platform roles, even in preview mode.
    canRevertToSold: ctx.isDeveloper && REVERTABLE.has(status),
    revokeBlockedReason,
  };
}

export function partnerRevocableStatuses(): Set<string> {
  return new Set(REVOKABLE);
}

export function adminRevocableStatuses(): Set<string> {
  return new Set(REVOKABLE);
}

export function assertCredentialActionAllowed(
  actions: CredentialActions,
  action: 'revoke' | 'pause' | 'unlock' | 'revertToSold'
): void {
  const allowed =
    (action === 'revoke' && actions.canRevoke) ||
    (action === 'pause' && actions.canPause) ||
    (action === 'unlock' && actions.canUnlock) ||
    (action === 'revertToSold' && actions.canRevertToSold);

  if (!allowed) {
    const message =
      action === 'revoke'
        ? actions.revokeBlockedReason ??
          'Revoke is only allowed before the token has been used.'
        : action === 'revertToSold'
          ? 'Revert to sold is only available to developers.'
          : `Action "${action}" is not allowed for this token.`;
    throw Object.assign(new Error(message), { status: 403, code: 'ACTION_NOT_ALLOWED' });
  }
}
