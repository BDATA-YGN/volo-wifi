export type SmsCollectionResult =
  | "PENDING"
  | "COLLECTED"
  | "PARTIAL"
  | "FAILED"
  | "SKIPPED";

export type SmsPaymentMethod = "CASH" | "BANK_TRANSFER" | "KBZPAY" | "WAVEPAY" | "OTHER";

export type CollectionScopeFilter = "all" | "today" | "tomorrow" | "overdue" | "completed";

export type CollectionKitSummary = {
  id: string;
  kitNumber: string | null;
  addressLine1: string | null;
  township: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type CollectionLicenseSummary = {
  id: string;
  licenseCode: string;
  status: string;
  customer: {
    id: string;
    fullName: string;
    township: string | null;
    addressLine1?: string | null;
  } | null;
  kit: CollectionKitSummary | null;
};

export type CollectionInvoiceSummary = {
  id: string;
  invoiceNo: string;
  status: string;
  currency: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
  dueAt: string | null;
};

export type CollectionPaymentSummary = {
  id: string;
  status: string;
  method: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  referenceNo: string | null;
};

export type MobileCollectionRecord = {
  id: string;
  licenseId: string;
  invoiceId: string | null;
  result: SmsCollectionResult;
  scheduledAt: string | null;
  visitedAt: string | null;
  note: string | null;
  collectedAmount: number;
  license: CollectionLicenseSummary | null;
  invoice: CollectionInvoiceSummary | null;
  payment: CollectionPaymentSummary | null;
};

export type CollectorHomeSummary = {
  assignedCollectionsToday: number;
  collectedAmountToday: number;
  pendingFinanceConfirmations: number;
  draftExpenses: number;
  openInvoiceAssignments: number;
  myOpenSupportTickets: number;
  unassignedSupportQueue: number;
  overdueCollections: number;
  mapLocationsCount: number;
  currency: string;
};

export type RecordCollectionOutcomePayload = {
  result: Exclude<SmsCollectionResult, "PENDING">;
  visitedAt?: string | null;
  collectedAmount?: number;
  note?: string | null;
  method?: SmsPaymentMethod;
  referenceNo?: string | null;
  allocations?: { invoiceId: string; amount: number }[];
};
