export type SupportTicketStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketCategory =
  | "BILLING"
  | "TECHNICAL"
  | "CONNECTIVITY"
  | "ACCOUNT"
  | "OTHER";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportTicketScopeFilter = "mine" | "queue" | "all";
export type SupportTicketStatusFilter = "active" | "all" | SupportTicketStatusValue;

export type SupportTicketCustomer = {
  id: string;
  fullName: string;
  township: string | null;
  organization: string | null;
  contactPhone: string | null;
};

export type SupportTicketLicense = {
  id: string;
  licenseCode: string;
  status: string;
};

export type SupportTicketMessage = {
  id: string;
  authorType: string;
  body: string;
  customerId: string | null;
  customer: { id: string; fullName: string } | null;
  adminId: string | null;
  admin: { id: string; fullName: string; username: string } | null;
  createdAt: string | null;
};

export type SupportTicketRecord = {
  id: string;
  ticketNo: string;
  customerId: string;
  customer: SupportTicketCustomer | null;
  licenseId: string | null;
  license: SupportTicketLicense | null;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatusValue;
  source: string;
  subject: string;
  description: string | null;
  assignedToAdminId: string | null;
  assignedToAdmin: { id: string; fullName: string; username: string } | null;
  messageCount: number;
  messages?: SupportTicketMessage[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type SupportCustomerSearchRow = {
  id: string;
  fullName: string;
  township: string | null;
  organization: string | null;
  licenses: SupportTicketLicense[];
};

export type CreateSupportTicketPayload = {
  customerId: string;
  licenseId?: string | null;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  source?: string;
  subject: string;
  description?: string | null;
  assignToSelf?: boolean;
};

export type MobileContentPost = {
  id: string;
  type: string;
  title: string;
  body: string;
  audience: string;
  isPinned: boolean;
  publishAt: string | null;
  expireAt: string | null;
  createdAt: string | null;
};

export type MapPin = {
  collectionId: string;
  licenseId: string;
  licenseCode: string;
  customerName: string | null;
  township: string | null;
  kit: {
    id: string;
    kitNumber: string | null;
    latitude: number | null;
    longitude: number | null;
    addressLine1: string | null;
    township: string | null;
  } | null;
  scheduledAt: string | null;
};
