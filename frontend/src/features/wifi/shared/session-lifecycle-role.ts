import { useAuthStore } from "@/features/core/auth/store";

const SESSION_LIFECYCLE_ROLES = new Set([
  "DEVELOPER",
  "ADMIN",
  "ORG_ADMIN",
  "ORG_OWNER",
]);

export function isSessionLifecycleAdminRole(roleName: string | null | undefined): boolean {
  const role = roleName?.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return Boolean(role && SESSION_LIFECYCLE_ROLES.has(role));
}

/** Developer, Admin, or ORG_ADMIN — Clear sessions / Revert to sold or activated. */
export function useCanManageTokenSessionLifecycle(): boolean {
  const { authData } = useAuthStore();
  return isSessionLifecycleAdminRole(authData?.role?.roleName);
}

export function gateSessionLifecycleActions<
  T extends {
    canClearSessions?: boolean;
    canRestoreActivated?: boolean;
    canRevertToSold?: boolean;
  },
>(actions: T | null | undefined, allowed: boolean): T | undefined {
  if (!actions) return undefined;
  if (allowed) return actions;
  return {
    ...actions,
    canClearSessions: false,
    canRestoreActivated: false,
    canRevertToSold: false,
  };
}
