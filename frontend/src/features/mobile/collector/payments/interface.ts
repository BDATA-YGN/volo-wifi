export type SmsPaymentMethod = "CASH" | "BANK_TRANSFER" | "KBZPAY" | "WAVEPAY" | "OTHER";

export type SmsPaymentStatus = "PENDING" | "CONFIRMED" | "VOID";

export type PaymentLicenseSummary = {
  id: string;
  licenseCode: string;
  status: string;
  customer: { id: string; fullName: string; township: string | null } | null;
};

export type OutstandingInvoiceRow = {
  id: string;
  invoiceNo: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
  available: number;
  currency: string;
};

export type PaymentAllocationFormValue = {
  invoiceId: string;
  amount: number;
};
