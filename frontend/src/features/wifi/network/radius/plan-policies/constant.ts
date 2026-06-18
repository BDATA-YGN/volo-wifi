import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { RadiusAttrPhase, RadiusAttrValueType } from "./types";

export const NETWORK_RADIUS_PLAN_POLICIES_API = buildWifiApiRoutes(
  "/wifi/network/radius/plan-policies"
);

export const PHASE_OPTIONS: { value: RadiusAttrPhase | ""; label: string }[] = [
  { value: "", label: "All phases" },
  { value: "REPLY", label: "Reply (Access-Accept)" },
  { value: "CHECK", label: "Check" },
];

export const PHASE_FORM_OPTIONS: { value: RadiusAttrPhase; label: string }[] = [
  { value: "REPLY", label: "Reply (Access-Accept)" },
  { value: "CHECK", label: "Check" },
];

export const VALUE_TYPE_OPTIONS: { value: RadiusAttrValueType; label: string }[] = [
  { value: "STRING", label: "String" },
  { value: "INTEGER", label: "Integer" },
  { value: "IPADDR", label: "IP address" },
  { value: "DATE", label: "Date" },
];

export const VALUE_TYPE_COLOR: Record<string, string> = {
  STRING: "blue",
  INTEGER: "cyan",
  IPADDR: "purple",
  DATE: "geekblue",
};

export const PHASE_COLOR: Record<string, string> = {
  REPLY: "blue",
  CHECK: "orange",
};

export const OP_OPTIONS = [
  { value: ":=", label: ":= (set)" },
  { value: "=", label: "= (equal)" },
  { value: "+=", label: "+=" },
  { value: "==", label: "==" },
];

export const VALUE_TEMPLATES = [
  { label: "Session seconds", value: "{timeSeconds}" },
  { label: "Data quota MB", value: "{dataMb}" },
  { label: "Max devices", value: "{maxDevices}" },
];
