import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const NETWORK_RADIUS_PROFILES_API = buildWifiApiRoutes("/wifi/network/radius/servers");

export const NAS_TYPE_SUGGESTIONS = [
  "other",
  "cisco",
  "computone",
  "livingston",
  "juniper",
  "max40xx",
  "multitech",
  "netserver",
  "pathras",
  "patton",
  "portslave",
  "tc",
  "usrhiper",
];
