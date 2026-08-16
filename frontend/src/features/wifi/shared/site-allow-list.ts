import { useAuthStore } from "@/features/core/auth/store";

export type WifiSiteAllowListEntry = {
  orgId: string;
  orgCode: string;
  stationIds: string[];
};

/** `null` = unrestricted for this org (no session allow-list entry). */
export function allowedStationIdsFromSession(
  allowList: WifiSiteAllowListEntry[] | undefined,
  orgId?: string | null
): string[] | null {
  if (!allowList?.length || !orgId) return null;
  const entry = allowList.find((row) => row.orgId === orgId);
  return entry ? entry.stationIds : null;
}

export function filterBySiteAllowList<T extends { id: string }>(
  items: T[],
  allowedIds: string[] | null
): T[] {
  if (!allowedIds) return items;
  const allowed = new Set(allowedIds);
  return items.filter((item) => allowed.has(item.id));
}

export function sessionStationAllowList(orgId?: string | null): string[] | null {
  return allowedStationIdsFromSession(
    useAuthStore.getState().authData?.wifiSiteAllowList,
    orgId
  );
}
