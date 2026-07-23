import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PartnerStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/commerce/partners` */
export const COMMERCE_PARTNERS_API = {
  ...buildWifiApiRoutes("/wifi/commerce/partners"),
  resetPassword: (id: string) => `/wifi/commerce/partners/reset-password/${id}`,
};

export const PARTNER_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,47}$/;

export const STATUS_OPTIONS: { value: PartnerStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DISABLED", label: "Disabled" },
];

export const STATUS_COLOR: Record<PartnerStatus, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DISABLED: "default",
};
