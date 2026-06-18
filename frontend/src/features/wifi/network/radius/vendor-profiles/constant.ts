import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { AttrRequirement } from "./types";

export const NETWORK_RADIUS_VENDOR_PROFILES_API = buildWifiApiRoutes(
  "/wifi/network/radius/vendor-profiles"
);

export const REQUIREMENT_OPTIONS: { value: AttrRequirement; label: string }[] = [
  { value: "OPTIONAL", label: "Optional" },
  { value: "MUST", label: "Required" },
];

export const VALUE_TYPE_COLOR: Record<string, string> = {
  STRING: "blue",
  INTEGER: "cyan",
  IPADDR: "purple",
  DATE: "geekblue",
};

export const VENDOR_SUGGESTIONS = ["Ruijie", "MikroTik", "Cisco", "Ubiquiti", "TP-Link", "H3C"];
