import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PaymentMethod } from "./types";
import type { SaleStatus } from "../orders/types";
import { STATUS_COLOR, STATUS_OPTIONS } from "../orders/constant";

/** Console API paths — mirrors backend `/wifi/commerce/transactions/payments` */
export const COMMERCE_TRANSACTIONS_PAYMENTS_API = buildWifiApiRoutes(
  "/wifi/commerce/transactions/payments"
);

export const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export const METHOD_COLOR: Record<PaymentMethod, string> = {
  CASH: "green",
  MOBILE_MONEY: "cyan",
  BANK_TRANSFER: "blue",
  CARD: "purple",
  OTHER: "default",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  OTHER: "Other",
};

export { STATUS_COLOR, STATUS_OPTIONS };
export type { SaleStatus };
