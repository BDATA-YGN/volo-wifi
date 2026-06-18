import type {
  OutstandingInvoiceRow,
  PaymentAllocationFormValue,
  PaymentLicenseSummary,
  SmsPaymentMethod,
  SmsPaymentStatus,
} from "./interface";

export type MobilePaymentRecord = {
  id: string;
  status: SmsPaymentStatus;
  method: SmsPaymentMethod;
  currency: string;
  amount: number;
  paidAt: string | null;
  referenceNo: string | null;
  note: string | null;
  licenseId: string;
  license: PaymentLicenseSummary | null;
  allocations: {
    id: string;
    invoiceId: string;
    amount: number;
    invoice: { id: string; invoiceNo: string } | null;
  }[];
};

export type PaymentStatusFilter = SmsPaymentStatus | "all";

export type RecordPaymentPayload = {
  licenseId: string;
  amount: number;
  method: SmsPaymentMethod;
  currency?: string;
  paidAt?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  allocations: PaymentAllocationFormValue[];
};

export type { OutstandingInvoiceRow, PaymentLicenseSummary };

export type MobileInvoiceAssignment = {
  id: string;
  status: string;
  dueAt: string | null;
  note: string | null;
  invoiceId: string;
  invoice: {
    id: string;
    invoiceNo: string;
    status: string;
    currency: string;
    total: number;
    paidTotal: number;
    balanceDue: number;
    available: number;
    dueAt: string | null;
    license: PaymentLicenseSummary | null;
  } | null;
};
