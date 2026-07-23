import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PlanPolicyAttributeInput, RadiusAttrPhase, RadiusAttrValueType } from "./types";

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

type VendorTemplate = {
  id: "mikrotik" | "ruijie";
  label: string;
  description: string;
  attributes: PlanPolicyAttributeInput[];
};

/** Preset reply attributes — time, speed, quota — for MikroTik Hotspot. */
export const MIKROTIK_POLICY_TEMPLATE: VendorTemplate = {
  id: "mikrotik",
  label: "MikroTik",
  description: "Session time, idle, interim, rate-limit, total byte quota",
  attributes: [
    {
      phase: "REPLY",
      attributeName: "Session-Timeout",
      op: ":=",
      valueType: "INTEGER",
      value: "{timeSeconds}",
      priority: 10,
      note: "Plan allow-time in seconds",
    },
    {
      phase: "REPLY",
      attributeName: "Idle-Timeout",
      op: ":=",
      valueType: "INTEGER",
      value: "600",
      priority: 20,
      note: "Disconnect after 10 min idle",
    },
    {
      phase: "REPLY",
      attributeName: "Acct-Interim-Interval",
      op: ":=",
      valueType: "INTEGER",
      value: "300",
      priority: 30,
      note: "Interim accounting every 5 min",
    },
    {
      phase: "REPLY",
      attributeName: "Mikrotik-Rate-Limit",
      op: ":=",
      valueType: "STRING",
      value: "2M/2M",
      priority: 40,
      note: "rx/tx — e.g. 2M/2M or 512k/512k",
    },
    {
      phase: "REPLY",
      attributeName: "Mikrotik-Total-Limit",
      op: ":=",
      valueType: "INTEGER",
      value: "5242880000",
      priority: 50,
      note: "Total bytes (example: 5 GB). Use converter below.",
    },
  ],
};

/** Preset reply attributes — time, speed — for Ruijie EG / WISPr. */
export const RUIJIE_POLICY_TEMPLATE: VendorTemplate = {
  id: "ruijie",
  label: "Ruijie",
  description: "Session time, idle, interim, WISPr up/down bandwidth",
  attributes: [
    {
      phase: "REPLY",
      attributeName: "Session-Timeout",
      op: ":=",
      valueType: "INTEGER",
      value: "{timeSeconds}",
      priority: 10,
      note: "Plan allow-time in seconds",
    },
    {
      phase: "REPLY",
      attributeName: "Idle-Timeout",
      op: ":=",
      valueType: "INTEGER",
      value: "600",
      priority: 20,
      note: "Disconnect after 10 min idle",
    },
    {
      phase: "REPLY",
      attributeName: "Acct-Interim-Interval",
      op: ":=",
      valueType: "INTEGER",
      value: "300",
      priority: 30,
      note: "Interim accounting every 5 min",
    },
    {
      phase: "REPLY",
      attributeName: "WISPr-Bandwidth-Max-Down",
      op: ":=",
      valueType: "INTEGER",
      value: "2000000",
      priority: 40,
      note: "Bits/sec download (example: 2 Mbps). Use converter below.",
    },
    {
      phase: "REPLY",
      attributeName: "WISPr-Bandwidth-Max-Up",
      op: ":=",
      valueType: "INTEGER",
      value: "2000000",
      priority: 41,
      note: "Bits/sec upload (example: 2 Mbps). Use converter below.",
    },
  ],
};

export const VENDOR_POLICY_TEMPLATES = [MIKROTIK_POLICY_TEMPLATE, RUIJIE_POLICY_TEMPLATE] as const;

export function resolveVendorPolicyTemplateId(
  vendorOrName: string | null | undefined
): "mikrotik" | "ruijie" | null {
  const s = (vendorOrName ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("mikrotik") || s.includes("routeros")) return "mikrotik";
  if (s.includes("ruijie") || s.includes("wispr")) return "ruijie";
  return null;
}

export function resolveVendorPolicyTemplate(vendorOrName: string | null | undefined) {
  const id = resolveVendorPolicyTemplateId(vendorOrName);
  if (!id) return null;
  return VENDOR_POLICY_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Clone template rows; optionally fill MikroTik byte quota from plan dataMb. */
export function buildAttributesFromVendorTemplate(
  vendorOrName: string | null | undefined,
  plan?: { dataMb?: number | null } | null
): PlanPolicyAttributeInput[] {
  const template = resolveVendorPolicyTemplate(vendorOrName);
  if (!template) return [];

  return template.attributes.map((row) => {
    const next = { ...row };
    if (
      row.attributeName === "Mikrotik-Total-Limit" &&
      plan?.dataMb != null &&
      plan.dataMb > 0
    ) {
      next.value = String(plan.dataMb * 1024 * 1024);
      next.note = `Total bytes from plan data (${plan.dataMb} MB)`;
    }
    return next;
  });
}
