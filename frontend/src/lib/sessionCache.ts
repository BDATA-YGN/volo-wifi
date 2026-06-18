/**
 * Clears session-scoped client state (menus, auth, permissions) without wiping
 * UI preferences such as theme.
 */
import Cookies from "js-cookie";
import { storageKey, migrateLegacyPersistedState } from "@/lib/cacheKeys";
import { COOKIES_CONSTANTS } from "@/utils/constants";
import { clearClientCookies } from "@/utils/clientUtils";
import { useAuthStore } from "@/features/core/auth/store";
import { useMenuStore } from "@/features/core/menu/menu";
import { usePermissionStore } from "@/features/core/permissions/store";
import { useMenuManagementStore } from "@/features/core/menuManagement/store";

const SESSION_STORAGE_SUFFIXES = ["auth-storage", "menu-storage"] as const;

function removeSessionPersistedStorage(): void {
  if (typeof window === "undefined") return;
  migrateLegacyPersistedState();
  for (const suffix of SESSION_STORAGE_SUFFIXES) {
    localStorage.removeItem(suffix);
    localStorage.removeItem(storageKey(suffix));
  }
}

function resetSessionStores(): void {
  useAuthStore.getState().clearAuthData();
  useMenuStore.getState().setMenus({});
  useMenuStore.getState().setLastMenuClick("");
  useMenuStore.getState().setLastMenuGroup("");
  usePermissionStore.getState().setPermissionData(null);
  useMenuManagementStore.getState().setMenuGroups([]);
}

function clearSessionCookies(): void {
  clearClientCookies();
  Cookies.remove(COOKIES_CONSTANTS.MENUS, { path: "/" });
}

/** Drop prior-user menus, auth, and permission caches before a new sign-in. */
export function clearSessionCaches(): void {
  removeSessionPersistedStorage();
  resetSessionStores();
  clearSessionCookies();
}

export function applySessionMenus(menus: Record<string, unknown>): void {
  useMenuStore.getState().setMenus(menus);
  usePermissionStore.getState().setPermissionData(
    Object.keys(menus).length > 0 ? menus : null
  );
}
