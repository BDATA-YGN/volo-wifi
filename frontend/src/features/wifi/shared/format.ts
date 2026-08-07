import dayjs from "dayjs";
import "@/lib/timezone";

/** Date-only display across WiFi console (e.g. 12 Jun 2026). */
export const WIFI_DATE_FORMAT = "DD MMM YYYY";

/** Date + time with 12-hour clock (e.g. 12 Jun 2026, 1:17 PM). */
export const WIFI_DATETIME_FORMAT = "DD MMM YYYY, h:mm A";

/** Time-only with 12-hour clock (e.g. 1:17 PM). */
export const WIFI_TIME_FORMAT = "h:mm A";

/** Time with seconds and 12-hour clock (e.g. 1:17:05 PM). */
export const WIFI_TIME_SECONDS_FORMAT = "h:mm:ss A";

/** Date + time with seconds and 12-hour clock (e.g. 12 Jun 2026, 1:17:05 PM). */
export const WIFI_DATETIME_SECONDS_FORMAT = "DD MMM YYYY, h:mm:ss A";

export function formatWifiDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).tz().format(WIFI_DATE_FORMAT);
}

export function formatWifiDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).tz().format(WIFI_DATETIME_FORMAT);
}

export function formatWifiTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).tz().format(WIFI_TIME_FORMAT);
}

export function formatWifiTimeWithSeconds(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).tz().format(WIFI_TIME_SECONDS_FORMAT);
}

export function formatWifiDateTimeWithSeconds(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).tz().format(WIFI_DATETIME_SECONDS_FORMAT);
}

/**
 * Mask voucher / access token for admin lists: first four chars as `*` + last two visible.
 * e.g. `LC0073` → `****73`
 */
export function maskVoucherToken(token: string | null | undefined): string {
  if (!token) return "—";
  const trimmed = token.trim();
  if (trimmed.length <= 2) return trimmed;
  return "*".repeat(4) + trimmed.slice(-2);
}
