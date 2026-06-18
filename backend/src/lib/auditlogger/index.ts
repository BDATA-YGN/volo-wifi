import PrismaDBConnection from '@/prisma/prisma-client';
import { Request } from 'express';
import { resolveClientIp, resolveUserAgent } from '@/utils/request-ip';

const prisma = PrismaDBConnection.getConnection();

export type AuditLogType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER' | 'SYSTEM' | 'REGISTER' | 'PAYMENT' | 'TOPUP' | 'SUBSCRIPTION' | 'CHAT' | 'ACCOUNT' | 'UPLOAD' | 'DOWNLOAD' | 'LIKE' | 'COMMENT';
export type AuditLogSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface AuditLogInput {
  type: AuditLogType;
  severity: AuditLogSeverity;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogOptions {
  details?: Record<string, unknown> | string;
}

class AuditLogger {
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          type: input.type,
          severity: input.severity,
          userId: input.userId,
          userEmail: input.userEmail,
          action: input.action,
          resource: input.resource,
          details: typeof input.details === 'object' ? JSON.stringify(input.details) : input.details || '',
          ipAddress: input.ipAddress || 'unknown',
          userAgent: input.userAgent || 'unknown',
          timestamp: new Date(),
        },
      });
    } catch (err) {
      console.error('Failed to create audit log:', err);
    }
  }

  async logFromRequest(
    req: Request,
    input: Omit<AuditLogInput, 'ipAddress' | 'userAgent'>,
    options?: AuditLogOptions
  ): Promise<void> {
    const details = options?.details
      ? typeof options.details === 'string'
        ? options.details
        : JSON.stringify(options.details)
      : undefined;

    await this.log({
      ...input,
      ipAddress: resolveClientIp(req) || 'unknown',
      userAgent: resolveUserAgent(req) || 'unknown',
      details,
    });
  }

  async logAction(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    type: AuditLogType,
    severity: AuditLogSeverity = 'INFO',
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      type,
      severity,
      userId,
      userEmail,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
    });
  }

  async logCreate(
    userId: string,
    userEmail: string,
    resource: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, 'CREATE', resource, 'CREATE', 'INFO', details, ipAddress, userAgent);
  }

  async logUpdate(
    userId: string,
    userEmail: string,
    resource: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, 'UPDATE', resource, 'UPDATE', 'INFO', details, ipAddress, userAgent);
  }

  async logDelete(
    userId: string,
    userEmail: string,
    resource: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, 'DELETE', resource, 'DELETE', 'INFO', details, ipAddress, userAgent);
  }

  async logLogin(
    userId: string,
    userEmail: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, 'LOGIN', 'auth', 'LOGIN', 'INFO', details, ipAddress, userAgent);
  }

  async logLogout(
    userId: string,
    userEmail: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, 'LOGOUT', 'auth', 'LOGOUT', 'INFO', details, ipAddress, userAgent);
  }

  async logError(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    error: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction(userId, userEmail, action, resource, 'SYSTEM', 'ERROR', error, ipAddress, userAgent);
  }
}

export const auditLogger = new AuditLogger();
