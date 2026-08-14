import { PARTNER_ROUTES } from "./constants";

export type PartnerNavItem = {
  href: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix";
};

export const PARTNER_NAV: PartnerNavItem[] = [
  { href: PARTNER_ROUTES.home, label: "Home", icon: "home", match: "exact" },
  { href: PARTNER_ROUTES.tokens, label: "Tokens", icon: "key", match: "prefix" },
  { href: PARTNER_ROUTES.orders, label: "Report", icon: "chart", match: "prefix" },
  { href: PARTNER_ROUTES.profile, label: "Profile", icon: "user", match: "prefix" },
];

export const PARTNER_SCREEN_TITLES: Record<string, string> = {
  [PARTNER_ROUTES.home]: "Workspace",
  [PARTNER_ROUTES.tokens]: "Access Tokens",
  [PARTNER_ROUTES.orders]: "Report",
  [PARTNER_ROUTES.insights]: "Insights",
  [PARTNER_ROUTES.profile]: "My Account",
};
