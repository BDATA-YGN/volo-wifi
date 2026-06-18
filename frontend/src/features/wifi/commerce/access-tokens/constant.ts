import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { CredentialStatus, PaymentMethod } from "./types";

/** Console API paths — mirrors backend `/wifi/commerce/access-tokens` */
export const COMMERCE_ACCESS_TOKENS_API = buildWifiApiRoutes("/wifi/commerce/access-tokens");

export const MAX_ISSUE_QUANTITY = 20;

export const STATUS_OPTIONS: { value: CredentialStatus; label: string }[] = [
  { value: "SOLD", label: "Sold" },
  { value: "ACTIVATED", label: "Activated" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REVOKED", label: "Revoked" },
  { value: "CONSUMED", label: "Consumed" },
];

/** Labels for legacy / internal statuses still stored on credentials. */
export const STATUS_LABELS: Partial<Record<CredentialStatus, string>> = {
  NEW: "New",
  ACTIVE: "Active",
  IN_USE: "In use",
};

export const STATUS_COLOR: Record<CredentialStatus, string> = {
  NEW: "default",
  SOLD: "blue",
  ACTIVE: "success",
  ACTIVATED: "success",
  IN_USE: "processing",
  PAUSED: "warning",
  EXPIRED: "default",
  REVOKED: "error",
  CONSUMED: "default",
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];
