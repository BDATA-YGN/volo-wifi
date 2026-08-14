const PARTNER_STATION_SCOPE_KEY = "volo-partner-station-scope";

export function loadPartnerStationScope(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PARTNER_STATION_SCOPE_KEY);
}

export function storePartnerStationScope(stationId: string | null): void {
  if (typeof window === "undefined") return;
  if (!stationId) {
    sessionStorage.removeItem(PARTNER_STATION_SCOPE_KEY);
    return;
  }
  sessionStorage.setItem(PARTNER_STATION_SCOPE_KEY, stationId);
}
