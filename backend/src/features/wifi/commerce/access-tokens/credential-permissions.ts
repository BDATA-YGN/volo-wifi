export type CredentialActions = {
  canRevoke: boolean;
  canPause: boolean;
  canUnlock: boolean;
  canRevertToSold: boolean;
  revokeBlockedReason?: string;
};

const PARTNER_REVOKABLE = new Set(['SOLD', 'NEW']);
const ADMIN_REVOKABLE = new Set(['SOLD', 'NEW', 'ACTIVATED', 'PAUSED', 'IN_USE', 'ACTIVE']);
const PAUSABLE = new Set(['ACTIVATED', 'IN_USE', 'ACTIVE']);
const UNLOCKABLE = new Set(['PAUSED']);
const REVERTABLE = new Set(['ACTIVATED', 'PAUSED', 'IN_USE', 'ACTIVE']);

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
  const isElevated = ctx.isDeveloper || ctx.mode === 'preview';
  const status = credential.status;

  if (isElevated) {
    return {
      canRevoke: ADMIN_REVOKABLE.has(status),
      canPause: PAUSABLE.has(status),
      canUnlock: UNLOCKABLE.has(status),
      canRevertToSold: REVERTABLE.has(status),
    };
  }

  const withinWindow = isRevokeWindowOpen(credential.soldAt, revokeWindowMinutes);
  const canRevoke = PARTNER_REVOKABLE.has(status) && withinWindow;

  let revokeBlockedReason: string | undefined;
  if (PARTNER_REVOKABLE.has(status) && !withinWindow) {
    revokeBlockedReason = `Revoke is only allowed within ${revokeWindowMinutes} minutes after sale.`;
  } else if (!PARTNER_REVOKABLE.has(status)) {
    revokeBlockedReason = 'This token cannot be revoked in its current status.';
  }

  return {
    canRevoke,
    canPause: false,
    canUnlock: UNLOCKABLE.has(status),
    canRevertToSold: false,
    revokeBlockedReason: canRevoke ? undefined : revokeBlockedReason,
  };
}

export function partnerRevocableStatuses(): Set<string> {
  return new Set(PARTNER_REVOKABLE);
}

export function adminRevocableStatuses(): Set<string> {
  return new Set(ADMIN_REVOKABLE);
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
        ? actions.revokeBlockedReason ?? 'Revoke is not allowed for this token.'
        : `Action "${action}" is not allowed for this token.`;
    throw Object.assign(new Error(message), { status: 403, code: 'ACTION_NOT_ALLOWED' });
  }
}
