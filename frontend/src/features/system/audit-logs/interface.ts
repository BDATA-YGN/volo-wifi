import type { AuditLogSeverity, AuditLogType } from "./constant";

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  type: AuditLogType | string;
  severity: AuditLogSeverity | string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface LoginLogRecord {
  /** BIGINT primary key — returned as string from the API (JSON-safe). */
  id: string;
  userId: string | null;
  userEmail: string | null;
  loginDateTime: string | null;
  loginDevices: string | null;
  loginPlatform: string | null;
  ipAddress: string | null;
  type: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AuditOverview {
  totalEvents: number;
  totalErrors: number;
  totalWarnings: number;
  events24h: number;
  events7d: number;
  loginCount: number;
  logoutCount: number;
  successRate: number;
  lastUpdated: string | null;
}

export interface LoginOverview {
  total: number;
  last24h: number;
  last7d: number;
  activeUsers7d: number;
  lastLoginAt: string | null;
}

export interface RetentionPreview {
  enabled: boolean;
  cron: string;
  auditRetentionDays: number;
  loginRetentionDays: number;
  batchSize: number;
  auditExpiredCount: number;
  loginExpiredCount: number;
}

export interface AuditListFilter {
  search?: string;
  types?: string[];
  severities?: string[];
  dateRange?: [string, string] | null;
  page?: number;
  limit?: number;
}

export interface LoginListFilter {
  search?: string;
  type?: string;
  platform?: string;
  dateRange?: [string, string] | null;
  page?: number;
  limit?: number;
}
