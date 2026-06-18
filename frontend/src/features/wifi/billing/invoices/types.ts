export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "CARD"
  | "OTHER";

export type InvoiceOrg = {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

export type InvoiceListRow = {
  id: string;
  orgId: string;
  invoiceNo: string;
  status: InvoiceStatus;
  billingCycle: string;
  billingPeriodFrom: string;
  billingPeriodTo: string;
  pricingSource: string;
  currency: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  dueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  org: InvoiceOrg;
  _count: { items: number; payments: number };
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineSubtotal: string;
  taxRate: string | null;
  taxAmount: string;
  lineTotal: string;
  stationSize: { id: string; code: string; name: string; sortOrder: number };
};

export type InvoicePayment = {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  refNo: string | null;
  note: string | null;
  createdAt: string;
  receivedByAdmin: { id: string; fullName: string; username: string };
};

export type InvoiceDetail = InvoiceListRow & {
  taxRate: string | null;
  licenseId: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
};

export type InvoiceOrgSummary = {
  org: InvoiceOrg;
  invoiceCount: number;
  outstandingAmount: string;
};

export type InvoicesListPayload = {
  invoices: InvoiceListRow[];
};

export type InvoicesOrgsPayload = {
  orgs: InvoiceOrgSummary[];
};

export type InvoicesMeta = {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  statusCounts?: Partial<Record<InvoiceStatus, number>>;
  outstandingTotal?: string;
};

export type InvoicesQueryParams = {
  orgId?: string;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type RecordPaymentFormValues = {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  refNo?: string;
  note?: string;
};

export type UpdateInvoiceFormValues = {
  status?: InvoiceStatus;
  notes?: string;
  issuedAt?: string | null;
  dueDate?: string;
};
