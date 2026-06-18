/** Client-readable cookie set after mobile login to route proxy auth. */
export const MOBILE_COOKIES = {
  ACTOR_TYPE: "sms_mobile_actor",
} as const;

export const MOBILE_API_PREFIX = "/v1/mobile";

export const MOBILE_ROUTES = {
  collector: {
    root: "/collector",
    login: "/collector/login",
    home: "/collector",
    collections: "/collector/collections",
    assignments: "/collector/assignments",
    payments: "/collector/payments",
    expenses: "/collector/expenses",
    map: "/collector/map",
    content: "/collector/content",
    support: "/collector/support",
    profile: "/collector/profile",
  },
  customer: {
    root: "/customer",
    login: "/customer/login",
    home: "/customer",
    licenses: "/customer/licenses",
    invoices: "/customer/invoices",
    payments: "/customer/payments",
    content: "/customer/content",
    profile: "/customer/profile",
    support: "/customer/support",
  },
} as const;

export const MOBILE_API_ROUTES = {
  login: `${MOBILE_API_PREFIX}/auth/login`,
  me: `${MOBILE_API_PREFIX}/auth/me`,
  logout: `${MOBILE_API_PREFIX}/auth/logout`,
  refresh: `${MOBILE_API_PREFIX}/auth/token/refresh`,
  changePassword: `${MOBILE_API_PREFIX}/auth/change-password`,
  collector: {
    home: `${MOBILE_API_PREFIX}/collector/home`,
    collections: `${MOBILE_API_PREFIX}/collector/collections`,
    collectionDetail: (id: string) => `${MOBILE_API_PREFIX}/collector/collections/${id}`,
    collectionResult: (id: string) => `${MOBILE_API_PREFIX}/collector/collections/${id}/result`,
    payments: `${MOBILE_API_PREFIX}/collector/payments`,
    paymentLicenses: `${MOBILE_API_PREFIX}/collector/payment-licenses`,
    paymentLicenseScan: `${MOBILE_API_PREFIX}/collector/payment-licenses/scan`,
    paymentLicenseInvoices: (licenseId: string) =>
      `${MOBILE_API_PREFIX}/collector/payment-licenses/${licenseId}/invoices`,
    invoiceAssignments: `${MOBILE_API_PREFIX}/collector/invoice-assignments`,
    acceptInvoiceAssignment: (id: string) =>
      `${MOBILE_API_PREFIX}/collector/invoice-assignments/${id}/accept`,
    supportTickets: `${MOBILE_API_PREFIX}/collector/support/tickets`,
    supportTicketDetail: (id: string) => `${MOBILE_API_PREFIX}/collector/support/tickets/${id}`,
    supportTicketAssignSelf: (id: string) =>
      `${MOBILE_API_PREFIX}/collector/support/tickets/${id}/assign-self`,
    supportTicketReply: (id: string) => `${MOBILE_API_PREFIX}/collector/support/tickets/${id}/reply`,
    supportTicketStatus: (id: string) => `${MOBILE_API_PREFIX}/collector/support/tickets/${id}/status`,
    supportCustomers: `${MOBILE_API_PREFIX}/collector/support/customers`,
    expenses: `${MOBILE_API_PREFIX}/collector/expenses`,
    expenseDetail: (id: string) => `${MOBILE_API_PREFIX}/collector/expenses/${id}`,
    expenseLines: (id: string) => `${MOBILE_API_PREFIX}/collector/expenses/${id}/lines`,
    expenseSubmit: (id: string) => `${MOBILE_API_PREFIX}/collector/expenses/${id}/submit`,
    accountCodes: `${MOBILE_API_PREFIX}/collector/account-codes`,
    map: `${MOBILE_API_PREFIX}/collector/map`,
    content: `${MOBILE_API_PREFIX}/collector/content`,
    contentDetail: (id: string) => `${MOBILE_API_PREFIX}/collector/content/${id}`,
    profile: `${MOBILE_API_PREFIX}/collector/profile`,
  },
  customer: {
    home: `${MOBILE_API_PREFIX}/customer/home`,
    licenses: `${MOBILE_API_PREFIX}/customer/licenses`,
    licenseDetail: (id: string) => `${MOBILE_API_PREFIX}/customer/licenses/${id}`,
    licenseCertificate: (id: string) => `${MOBILE_API_PREFIX}/customer/licenses/${id}/certificate`,
    deviceDetail: (kitId: string) => `${MOBILE_API_PREFIX}/customer/devices/${kitId}`,
    invoices: `${MOBILE_API_PREFIX}/customer/invoices`,
    invoiceDetail: (id: string) => `${MOBILE_API_PREFIX}/customer/invoices/${id}`,
    payments: `${MOBILE_API_PREFIX}/customer/payments`,
    content: `${MOBILE_API_PREFIX}/customer/content`,
    contentDetail: (id: string) => `${MOBILE_API_PREFIX}/customer/content/${id}`,
    profile: `${MOBILE_API_PREFIX}/customer/profile`,
    support: `${MOBILE_API_PREFIX}/customer/support`,
    supportTickets: `${MOBILE_API_PREFIX}/customer/support/tickets`,
    supportTicketDetail: (id: string) => `${MOBILE_API_PREFIX}/customer/support/tickets/${id}`,
    supportTicketReply: (id: string) => `${MOBILE_API_PREFIX}/customer/support/tickets/${id}/reply`,
  },
} as const;
