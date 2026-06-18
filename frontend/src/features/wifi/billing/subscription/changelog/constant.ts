import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { LicenseChangeType } from "./types";

export const BILLING_SUBSCRIPTION_CHANGELOG_API = buildWifiApiRoutes(
  "/wifi/billing/subscription/changelog"
);

export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "geekblue",
};

export const CHANGE_TYPE_OPTIONS: {
  value: LicenseChangeType | "";
  label: string;
}[] = [
  { value: "", label: "All change types" },
  { value: "STATION_LIMIT_CHANGE", label: "Site limit" },
  { value: "STATUS_CHANGE", label: "Status" },
  { value: "STATION_SIZE_PRICE_CHANGE", label: "Tier rate" },
  { value: "PRICE_CHANGE", label: "Price" },
  { value: "OTHER", label: "Other" },
];

export const CHANGE_TYPE_COLOR: Record<string, string> = {
  STATION_LIMIT_CHANGE: "blue",
  STATUS_CHANGE: "orange",
  STATION_SIZE_PRICE_CHANGE: "purple",
  PRICE_CHANGE: "purple",
  OTHER: "default",
};

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};
