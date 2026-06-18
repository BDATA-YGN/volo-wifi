import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PriceBookScope } from "./types";

const base = "/wifi/catalog/retail-pricing";

/** Console API paths — mirrors backend `/wifi/catalog/retail-pricing` */
export const CATALOG_RETAIL_PRICING_API = {
  ...buildWifiApiRoutes(base),
  upsertPrice: (priceId?: string) => (priceId ? `${base}/prices/${priceId}` : `${base}/prices`),
  deletePrice: (priceId: string) => `${base}/prices/delete/${priceId}`,
};

export const SCOPE_OPTIONS: { value: PriceBookScope; label: string; description: string }[] = [
  {
    value: "DEFAULT",
    label: "Organization default",
    description: "Fallback retail prices for the whole tenant",
  },
  {
    value: "RESELLER",
    label: "Reseller",
    description: "Override prices for a specific partner",
  },
  {
    value: "STATION",
    label: "Site",
    description: "Override prices for a single WiFi site",
  },
];

export const SCOPE_COLOR: Record<PriceBookScope, string> = {
  DEFAULT: "gold",
  RESELLER: "blue",
  STATION: "purple",
};
