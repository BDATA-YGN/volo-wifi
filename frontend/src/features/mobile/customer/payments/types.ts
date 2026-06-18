export type PaymentStatusFilter = "all" | "PENDING" | "CONFIRMED" | "VOID";

export interface MobileCustomerPayment {
  id: string;
  status: PaymentStatusFilter | string;
  method: string;
  currency: string;
  amount: number;
  paidAt: string | null;
  referenceNo: string | null;
  note: string | null;
  licenseId: string;
  license: { id: string; licenseCode: string; status: string } | null;
  allocations: {
    id: string;
    invoiceId: string;
    amount: number;
    invoice: { id: string; invoiceNo: string } | null;
  }[];
}
