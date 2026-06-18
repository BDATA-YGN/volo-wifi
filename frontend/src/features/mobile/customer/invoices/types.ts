export type InvoiceFilter = "all" | "unpaid" | "paid";

export type MobileInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID";

export interface MobileInvoiceLine {
  id: string;
  kind: string;
  title: string;
  qty: number;
  unitPrice: number;
  amount: number;
  accountCode: { id: string; code: string; name: string } | null;
}

export interface MobileInvoice {
  id: string;
  invoiceNo: string;
  status: MobileInvoiceStatus;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paidTotal: number;
  balanceDue: number;
  licenseId: string;
  lines?: MobileInvoiceLine[];
}
