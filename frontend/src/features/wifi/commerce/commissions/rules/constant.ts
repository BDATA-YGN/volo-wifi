import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { CommissionType } from "./types";

/** Console API paths — mirrors backend `/wifi/commerce/commissions/rules` */
export const COMMERCE_COMMISSIONS_RULES_API = buildWifiApiRoutes(
  "/wifi/commerce/commissions/rules"
);

export const TYPE_OPTIONS: { value: CommissionType; label: string }[] = [
  { value: "PERCENT", label: "Percentage of sale" },
  { value: "FIXED", label: "Fixed amount per sale" },
];

export const TYPE_COLOR: Record<CommissionType, string> = {
  PERCENT: "blue",
  FIXED: "purple",
};
