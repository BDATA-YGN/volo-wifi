export type CredentialActions = {
  canRevoke: boolean;
  canPause: boolean;
  canUnlock: boolean;
  canAllowNewDevice: boolean;
  canClearSessions: boolean;
  canRestoreActivated: boolean;
  canRevertToSold: boolean;
  revokeBlockedReason?: string;
};

/** Revoke is only allowed before the token has been used (sold, not yet activated). */
const REVOKABLE = new Set(['SOLD']);
const PAUSABLE = new Set(['ACTIVATED']);
const UNLOCKABLE = new Set(['PAUSED']);
const ALLOW_NEW_DEVICE = new Set(['ACTIVATED']);
const SESSION_CLEARABLE = new Set(['ACTIVATED', 'PAUSED', 'CONSUMED']);
const RESTORABLE_CONSUMED = new Set(['CONSUMED']);
const REVERTABLE = new Set(['ACTIVATED', 'PAUSED', 'CONSUMED']);

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
    // Partner + org staff: free device slots for ACTIVATED tokens (does not raise maxDevices).
    canAllowNewDevice: ALLOW_NEW_DEVICE.has(status),
    canClearSessions: SESSION_CLEARABLE.has(status),
    canRestoreActivated: RESTORABLE_CONSUMED.has(status),
    // Developer role only — not other platform roles, even in preview mode.
    canRevertToSold:
      (ctx.isDeveloper && REVERTABLE.has(status)) ||
      (isOpsElevated && RESTORABLE_CONSUMED.has(status)),
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
  action: 'revoke' | 'pause' | 'unlock' | 'allowNewDevice' | 'clearSessions' | 'restoreActivated' | 'revertToSold'
): void {
  const allowed =
    (action === 'revoke' && actions.canRevoke) ||
    (action === 'pause' && actions.canPause) ||
    (action === 'unlock' && actions.canUnlock) ||
    (action === 'allowNewDevice' && actions.canAllowNewDevice) ||
    (action === 'clearSessions' && actions.canClearSessions) ||
    (action === 'restoreActivated' && actions.canRestoreActivated) ||
    (action === 'revertToSold' && actions.canRevertToSold);

  if (!allowed) {
    const message =
      action === 'revoke'
        ? actions.revokeBlockedReason ??
          'Revoke is only allowed before the token has been used.'
        : action === 'revertToSold'
          ? 'Revert to sold is only available to developers, or org staff for consumed tokens.'
          : action === 'restoreActivated'
            ? 'Restore to activated is only available for consumed tokens.'
          : action === 'clearSessions'
            ? 'Clear sessions is only available for activated, paused, or consumed tokens.'
          : action === 'allowNewDevice'
            ? 'Allow new device is only available for activated tokens.'
            : `Action "${action}" is not allowed for this token.`;
    throw Object.assign(new Error(message), { status: 403, code: 'ACTION_NOT_ALLOWED' });
  }
}
