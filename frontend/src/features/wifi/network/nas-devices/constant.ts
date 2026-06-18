import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { DeviceType } from "./types";

export const NETWORK_NAS_DEVICES_API = buildWifiApiRoutes("/wifi/network/nas-devices");

export const DEVICE_TYPE_OPTIONS: { value: DeviceType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "ROUTER", label: "Router" },
  { value: "AP", label: "Access point" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "SWITCH", label: "Switch" },
];

export const DEVICE_TYPE_FORM_OPTIONS: { value: DeviceType; label: string }[] = [
  { value: "ROUTER", label: "Router" },
  { value: "AP", label: "Access point" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "SWITCH", label: "Switch" },
];

export const DEVICE_TYPE_COLOR: Record<string, string> = {
  ROUTER: "blue",
  AP: "cyan",
  CONTROLLER: "purple",
  SWITCH: "geekblue",
};

export const NAS_TYPE_SUGGESTIONS = [
  "other",
  "cisco",
  "mikrotik",
  "ruijie",
  "ubiquiti",
  "computone",
  "livingston",
  "max40xx",
];
