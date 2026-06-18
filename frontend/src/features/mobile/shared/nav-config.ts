import type { MobileNavItem } from "./types";
import { MOBILE_ROUTES } from "./constants";

export const COLLECTOR_NAV: MobileNavItem[] = [
  { href: MOBILE_ROUTES.collector.home, label: "Home", icon: "home", match: "exact" },
  { href: MOBILE_ROUTES.collector.collections, label: "Collections", icon: "clipboard", match: "prefix" },
  { href: MOBILE_ROUTES.collector.payments, label: "Payments", icon: "wallet", match: "prefix" },
  { href: MOBILE_ROUTES.collector.expenses, label: "Expenses", icon: "receipt", match: "prefix" },
  { href: MOBILE_ROUTES.collector.profile, label: "Profile", icon: "user", match: "prefix" },
];

export const CUSTOMER_NAV: MobileNavItem[] = [
  { href: MOBILE_ROUTES.customer.home, label: "Home", icon: "home", match: "exact" },
  { href: MOBILE_ROUTES.customer.invoices, label: "Invoices", icon: "file-text", match: "prefix" },
  { href: MOBILE_ROUTES.customer.licenses, label: "Licenses", icon: "satellite", match: "prefix" },
  { href: MOBILE_ROUTES.customer.support, label: "Support", icon: "headphones", match: "prefix" },
  { href: MOBILE_ROUTES.customer.profile, label: "Profile", icon: "user", match: "prefix" },
];

export const COLLECTOR_SCREEN_TITLES: Record<string, string> = {
  [MOBILE_ROUTES.collector.home]: "Today",
  [MOBILE_ROUTES.collector.collections]: "Collections",
  [MOBILE_ROUTES.collector.assignments]: "Invoice Assignments",
  [MOBILE_ROUTES.collector.payments]: "Receive Payment",
  [MOBILE_ROUTES.collector.expenses]: "Expenses",
  [MOBILE_ROUTES.collector.map]: "Map",
  [MOBILE_ROUTES.collector.content]: "Guides & Policies",
  [MOBILE_ROUTES.collector.support]: "Customer Support",
  [MOBILE_ROUTES.collector.profile]: "My Account",
};

export const CUSTOMER_SCREEN_TITLES: Record<string, string> = {
  [MOBILE_ROUTES.customer.home]: "Overview",
  [MOBILE_ROUTES.customer.licenses]: "My Licenses",
  [MOBILE_ROUTES.customer.invoices]: "Invoices & Billing",
  [MOBILE_ROUTES.customer.payments]: "Payment History",
  [MOBILE_ROUTES.customer.content]: "Notices & Guides",
  [MOBILE_ROUTES.customer.profile]: "My Profile",
  [MOBILE_ROUTES.customer.support]: "Support Tickets",
};
