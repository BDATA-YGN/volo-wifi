export type CustomerTicketStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type CustomerTicketCategory =
  | "BILLING"
  | "TECHNICAL"
  | "CONNECTIVITY"
  | "ACCOUNT"
  | "OTHER";

export type CustomerTicketStatusFilter = "active" | "all" | CustomerTicketStatusValue;

export type CustomerTicketLicense = {
  id: string;
  licenseCode: string;
  status: string;
};

export type CustomerTicketMessage = {
  id: string;
  authorType: string;
  body: string;
  customerId: string | null;
  customer: { id: string; fullName: string } | null;
  adminId: string | null;
  admin: { id: string; fullName: string; username: string } | null;
  createdAt: string | null;
};

export type CustomerSupportTicket = {
  id: string;
  ticketNo: string;
  customerId: string;
  licenseId: string | null;
  license: CustomerTicketLicense | null;
  category: CustomerTicketCategory;
  priority: string;
  status: CustomerTicketStatusValue;
  source: string;
  subject: string;
  description: string | null;
  assignedToAdminId: string | null;
  assignedToAdmin: { id: string; fullName: string; username: string } | null;
  messageCount: number;
  messages?: CustomerTicketMessage[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateCustomerSupportTicketPayload = {
  licenseId?: string | null;
  category?: CustomerTicketCategory;
  subject: string;
  description?: string | null;
};
