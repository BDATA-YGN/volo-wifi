import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PaymentMethod, SaleStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/commerce/transactions/orders` */
export const COMMERCE_TRANSACTIONS_ORDERS_API = buildWifiApiRoutes(
  "/wifi/commerce/transactions/orders"
);

export const STATUS_OPTIONS: { value: SaleStatus; label: string }[] = [
  { value: "PAID", label: "Paid" },
  { value: "DRAFT", label: "Draft" },
  { value: "VOID", label: "Void" },
  { value: "REFUNDED", label: "Refunded" },
];

export const STATUS_COLOR: Record<SaleStatus, string> = {
  DRAFT: "default",
  PAID: "success",
  VOID: "error",
  REFUNDED: "warning",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  OTHER: "Other",
};
