import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PartnerStatus } from "@/features/wifi/commerce/partners/types";

/** Console API paths — mirrors backend `/wifi/commerce/partners/workspace` */
export const COMMERCE_PARTNERS_WORKSPACE_API = buildWifiApiRoutes(
  "/wifi/commerce/partners/workspace"
);

export const STATUS_COLOR: Record<PartnerStatus, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DISABLED: "default",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PAID: "success",
  VOID: "error",
  REFUNDED: "warning",
};
