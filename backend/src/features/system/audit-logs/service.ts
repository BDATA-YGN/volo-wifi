import { PrismaClient } from '@/generated/prisma/client';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
const prisma = PrismaDBConnection.getConnection();

/**
 * Mirrors the Prisma `AuditLogType` enum. Keep these in sync with
 * `backend/src/prisma/schema.prisma → enum AuditLogType`.
 */
export type AuditLogType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'OTHER'
  | 'SYSTEM'
  | 'REGISTER'
  | 'PAYMENT'
  | 'TOPUP'
  | 'SUBSCRIPTION'
  | 'CHAT'
  | 'ACCOUNT'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'LIKE'
  | 'COMMENT';

interface CreateAuditLogInput {
  type: AuditLogType;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (log: CreateAuditLogInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        ...log,
        timestamp: new Date(),
        details: log.details || '',
        ipAddress: log.ipAddress || 'unknown',
        userAgent: log.userAgent || 'unknown',
      },
    });
  } catch (err) {
    logger.warn('Failed to create audit log', { err });
  }
};

