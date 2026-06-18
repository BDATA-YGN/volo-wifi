import type { Request } from 'express';
import type { Admin, AdminToken, PrismaClient } from '@/generated/prisma/client';
import {
  AUTH_COOKIE_NAMES,
  resolveMobileActorFromHeader,
  resolveMobileAuthProfileFromPath,
  type AuthAppProfile,
} from '@/features/auth/auth-cookies';
import { CustomException } from '@/utils/exception';
import { comparePassword } from '@/utils/password';
import type { JwtService } from '@/utils/jwt';
import { DUMMY_PASSWORD_HASH, INVALID_CREDENTIALS_MESSAGE } from './auth.constants';

export function resolveMobileSessionProfile(req: Request): AuthAppProfile {
  const fromHeader = resolveMobileActorFromHeader(req.headers['x-sms-mobile-actor']);
  if (fromHeader) return fromHeader;

  const fromPath = resolveMobileAuthProfileFromPath(req.originalUrl || req.path || '');
  if (fromPath) return fromPath;

  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies?.[AUTH_COOKIE_NAMES.collector.refresh] || cookies?.[AUTH_COOKIE_NAMES.collector.access]) {
    return 'collector';
  }
  if (cookies?.[AUTH_COOKIE_NAMES.customer.refresh] || cookies?.[AUTH_COOKIE_NAMES.customer.access]) {
    return 'customer';
  }

  throw new CustomException(
    400,
    'ACTOR_REQUIRED',
    'Mobile actor is required. Send x-sms-mobile-actor or use the correct session cookies.',
  );
}

/** Uniform failed-login response; runs dummy bcrypt when the account does not exist. */
export async function rejectInvalidCredentials(password: string): Promise<never> {
  await comparePassword(password, DUMMY_PASSWORD_HASH);
  throw new CustomException(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
}

export async function invalidateAdminSessions(
  prisma: PrismaClient,
  adminId: string,
  options?: { exceptTokenId?: string },
): Promise<void> {
  await prisma.adminToken.updateMany({
    where: {
      adminId,
      isValid: true,
      deletedAt: null,
      ...(options?.exceptTokenId ? { id: { not: options.exceptTokenId } } : {}),
    },
    data: { isValid: false, updatedAt: new Date() },
  });
}

export async function assertAdminCanAuthenticate(admin: Admin | null | undefined): Promise<Admin> {
  if (!admin || admin.deletedAt !== null || admin.isActive === false) {
    throw new CustomException(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
  }
  if (admin.isBlocked) {
    throw new CustomException(403, 'ACCOUNT_BLOCKED', 'This account has been blocked.');
  }
  return admin;
}

/**
 * Validates refresh token record + JWT. On reuse of a rotated refresh token,
 * revokes all active sessions for that admin (possible token theft).
 */
export async function validateRefreshTokenRecord(
  prisma: PrismaClient,
  jwtService: JwtService,
  refreshToken: string,
): Promise<AdminToken> {
  const record = await prisma.adminToken.findFirst({
    where: { refreshToken, deletedAt: null },
  });

  if (!record) {
    throw new CustomException(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }

  if (!record.isValid) {
    await invalidateAdminSessions(prisma, record.adminId);
    throw new CustomException(
      401,
      'SESSION_REVOKED',
      'Session was revoked. Please sign in again.',
    );
  }

  if (!(await jwtService.isValid(record.refreshToken))) {
    await prisma.adminToken.update({
      where: { id: record.id },
      data: { isValid: false, updatedAt: new Date() },
    });
    throw new CustomException(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }

  return record;
}

export async function loadActiveAdminWithRole(prisma: PrismaClient, adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: { role: true },
  });

  if (!admin || admin.deletedAt !== null || !admin.isActive) {
    throw new CustomException(401, 'INVALID_TOKEN', 'Account is not active');
  }
  if (admin.isBlocked) {
    throw new CustomException(403, 'ACCOUNT_BLOCKED', 'This account has been blocked');
  }

  return admin;
}
