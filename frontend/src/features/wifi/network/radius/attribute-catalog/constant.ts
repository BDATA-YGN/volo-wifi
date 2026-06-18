import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { RadiusAttrValueType } from "./types";

export const NETWORK_RADIUS_ATTRIBUTE_CATALOG_API = buildWifiApiRoutes(
  "/wifi/network/radius/attribute-catalog"
);

export const VALUE_TYPE_OPTIONS: { value: RadiusAttrValueType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "STRING", label: "String" },
  { value: "INTEGER", label: "Integer" },
  { value: "IPADDR", label: "IP address" },
  { value: "DATE", label: "Date" },
];

export const VALUE_TYPE_FORM_OPTIONS: { value: RadiusAttrValueType; label: string }[] = [
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

export const OP_OPTIONS = [
  { value: ":=", label: ":= (set)" },
  { value: "=", label: "= (equal)" },
  { value: "+=", label: "+=" },
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
];

export const COMMON_ATTRIBUTES: {
  freeradiusName: string;
  displayName: string;
  valueType: RadiusAttrValueType;
  op?: string;
}[] = [
  { freeradiusName: "Session-Timeout", displayName: "Session Timeout", valueType: "INTEGER" },
  { freeradiusName: "Idle-Timeout", displayName: "Idle Timeout", valueType: "INTEGER" },
  { freeradiusName: "WISPr-Bandwidth-Max-Down", displayName: "Max Download (WISPr)", valueType: "INTEGER" },
  { freeradiusName: "WISPr-Bandwidth-Max-Up", displayName: "Max Upload (WISPr)", valueType: "INTEGER" },
  { freeradiusName: "Framed-IP-Address", displayName: "Framed IP Address", valueType: "IPADDR" },
  { freeradiusName: "Filter-Id", displayName: "Filter ID", valueType: "STRING" },
];
