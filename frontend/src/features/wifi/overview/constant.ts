import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { DashboardWidgetDefinition } from "./types";

/** Console API paths — mirrors backend `/wifi` */
export const WIFI_OVERVIEW_API = buildWifiApiRoutes("/wifi");

export const AUTO_REFRESH_MS = 60_000;

export const PERSONA_LABELS: Record<string, string> = {
  ORG_ADMIN: "Org administrator",
  ORG_FINANCE: "Finance",
  ORG_VIEWER: "Viewer",
  STATION_OPS: "Site operations",
  PARTNER: "Partner",
  DEVELOPER: "Platform developer",
  PLATFORM_ADMIN: "Platform admin",
  // Legacy persona codes (existing memberships)
  ORG_OWNER: "Org administrator",
  STATION_OPERATOR: "Site operations",
  STATION_MANAGER: "Site operations",
  RESELLER_MANAGER: "Partner",
  FINANCE_CLERK: "Finance",
};

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: "operations",
    title: "Live operations",
    description: "Active sessions, stalled clients, and hourly activity.",
    href: "/wifi/analytics/live-ops",
    routes: ["/wifi/analytics/live-ops", "/wifi/network/radius/live-sessions"],
    personas: ["STATION_OPS", "ORG_ADMIN", "DEVELOPER"],
  },
  {
    id: "commerce",
    title: "Commerce pulse",
    description: "Today's orders, revenue, and partner sales velocity.",
    href: "/wifi/analytics/revenue",
    routes: [
      "/wifi/analytics/revenue",
      "/wifi/commerce/transactions/orders",
      "/wifi/commerce/partners/insights",
    ],
    personas: ["ORG_ADMIN", "PARTNER"],
  },
  {
    id: "finance",
    title: "Reconciliation",
    description: "Settlement approvals and cash reconciliation queue.",
    href: "/wifi/analytics/reconciliation/approvals",
    routes: [
      "/wifi/analytics/reconciliation/approvals",
      "/wifi/analytics/reconciliation/settlements",
    ],
    personas: ["ORG_FINANCE", "ORG_ADMIN"],
  },
  {
    id: "network",
    title: "Network fleet",
    description: "Site and NAS inventory readiness across the fleet.",
    href: "/wifi/analytics/site-inventory",
    routes: ["/wifi/analytics/site-inventory", "/wifi/analytics/nas-inventory", "/wifi/sites"],
    personas: ["STATION_OPS", "ORG_ADMIN"],
  },
  {
    id: "billing",
    title: "Subscription",
    description: "Licensed sites, capacity tiers, and billing health.",
    href: "/wifi/billing/subscription",
    routes: ["/wifi/billing/subscription", "/wifi/billing/invoices"],
    personas: ["ORG_FINANCE", "DEVELOPER"],
  },
  {
    id: "analytics",
    title: "Analytics overview",
    description: "7-day trends across sites, partners, and session traffic.",
    href: "/wifi/analytics/sites",
    routes: [
      "/wifi/analytics/sites",
      "/wifi/analytics/session-traffic",
      "/wifi/analytics/partners",
    ],
    personas: ["ORG_VIEWER", "ORG_ADMIN", "ORG_FINANCE"],
  },
];
