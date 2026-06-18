import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PayoutStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/commerce/commissions/payouts` */
export const COMMERCE_COMMISSIONS_PAYOUTS_API = buildWifiApiRoutes(
  "/wifi/commerce/commissions/payouts"
);

export const STATUS_OPTIONS: { value: PayoutStatus; label: string }[] = [
  { value: "PENDING", label: "Pending review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
];

export const STATUS_COLOR: Record<PayoutStatus, string> = {
  PENDING: "gold",
  APPROVED: "blue",
  PAID: "green",
  REJECTED: "red",
};

export const NEXT_ACTIONS: Partial<Record<PayoutStatus, { status: PayoutStatus; label: string }[]>> =
  {
    PENDING: [
      { status: "APPROVED", label: "Approve" },
      { status: "REJECTED", label: "Reject" },
    ],
    APPROVED: [
      { status: "PAID", label: "Mark paid" },
      { status: "REJECTED", label: "Reject" },
    ],
  };
