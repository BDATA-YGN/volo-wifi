import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '@/features/system/audit-logs/service';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { Admin } from '@/generated/prisma/client';
import { resolveClientIp, resolveUserAgent } from '@/utils/request-ip';

const scrubSensitiveData = (data: any, sensitiveKeys: string[] = ['password', 'token', 'secret', 'refreshToken', 'authorization', 'cookie']) => {
  if (!data || typeof data !== 'object') return data;
  const clean = Array.isArray(data) ? [...data] : { ...data };
  for (const key of Object.keys(clean)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      (clean as any)[key] = '[REDACTED]';
    } else if (typeof (clean as any)[key] === 'object') {
      (clean as any)[key] = scrubSensitiveData((clean as any)[key], sensitiveKeys);
    }
  }
  return clean;
};

export const auditLogger = (type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER', resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user as Admin;
    // Fire-and-forget: audit logging must not block request latency.
    void createAuditLog({
      type,
      severity: 'INFO',
      userId: user.id || 'anonymous',
      userEmail: user.username || 'anonymous',
      action: `${req.method} ${req.originalUrl}`,
      resource,
      ipAddress: resolveClientIp(req) || undefined,
      userAgent: resolveUserAgent(req) || undefined,
      details: JSON.stringify(scrubSensitiveData(req.body)),
    });
    next();
  };
};

