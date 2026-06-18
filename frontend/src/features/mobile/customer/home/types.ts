import type { MobileContentPost } from "../content/types";

export interface CustomerHomeSummary {
  activeLicenses: number;
  unpaidInvoices: { count: number; totalDue: number; currency: string };
  openSupportTickets: number;
  latestNotices: MobileContentPost[];
  asOf: string;
}
