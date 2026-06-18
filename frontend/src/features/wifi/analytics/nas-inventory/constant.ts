import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { DeviceType } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/nas-inventory` */
export const ANALYTICS_NAS_INVENTORY_API = buildWifiApiRoutes("/wifi/analytics/nas-inventory");

export const DEVICE_TYPE_OPTIONS: { value: DeviceType; label: string }[] = [
  { value: "ROUTER", label: "Router" },
  { value: "AP", label: "Access point" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "SWITCH", label: "Switch" },
];

export const DEVICE_TYPE_COLOR: Record<DeviceType, string> = {
  ROUTER: "blue",
  AP: "cyan",
  CONTROLLER: "purple",
  SWITCH: "geekblue",
};
