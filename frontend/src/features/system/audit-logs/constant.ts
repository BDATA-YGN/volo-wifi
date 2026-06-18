export const AUDIT_LOG_ROUTES = {
  list: () => `/audit/logs`,
  detail: (id: string) => `/audit/logs/${encodeURIComponent(id)}`,
  overview: () => `/audit/overview`,
  loginList: () => `/audit/login-logs`,
  loginOverview: () => `/audit/login-logs/overview`,
  retention: () => `/audit/retention`,
};

/** Mirrors `AuditLogType` enum in `backend/src/prisma/schema.prisma`. */
export const AUDIT_LOG_TYPES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "OTHER",
  "SYSTEM",
  "REGISTER",
  "PAYMENT",
  "TOPUP",
  "SUBSCRIPTION",
  "CHAT",
  "ACCOUNT",
  "UPLOAD",
  "DOWNLOAD",
  "LIKE",
  "COMMENT",
] as const;

export type AuditLogType = (typeof AUDIT_LOG_TYPES)[number];

export const AUDIT_LOG_SEVERITIES = ["INFO", "WARNING", "ERROR"] as const;
export type AuditLogSeverity = (typeof AUDIT_LOG_SEVERITIES)[number];

/** Visual mapping for severity badges. */
export const SEVERITY_COLOR: Record<AuditLogSeverity, string> = {
  INFO: "blue",
  WARNING: "gold",
  ERROR: "red",
};

/** Visual mapping for audit type tags. */
export const TYPE_COLOR: Record<string, string> = {
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  LOGIN: "geekblue",
  LOGOUT: "purple",
  SYSTEM: "default",
  PAYMENT: "gold",
  TOPUP: "gold",
  SUBSCRIPTION: "magenta",
  UPLOAD: "cyan",
  DOWNLOAD: "cyan",
  REGISTER: "lime",
  CHAT: "orange",
  ACCOUNT: "volcano",
  LIKE: "pink",
  COMMENT: "pink",
  OTHER: "default",
};
