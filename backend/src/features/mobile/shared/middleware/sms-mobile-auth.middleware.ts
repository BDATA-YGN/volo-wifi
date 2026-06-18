import { NextFunction, Response } from 'express';
import { Container } from 'typedi';
import { AuthService } from '@/features/core/auth/service';
import { resolveMobileAuthProfileFromPath } from '@/features/auth/auth-cookies';
import { extractAccessToken } from '@/features/mobile/shared/utils/token';
import { CustomException } from '@/utils/exception';
import PrismaDBConnection from '@/prisma/prisma-client';
import { loadSmsActorForAdmin } from '../resolve-actor';
import type { SmsMobileRequest } from '../types/mobile-request';

const prisma = PrismaDBConnection.getConnection();

/**
 * Bearer token (mobile) or `access_token` cookie (web) — no refresh cookie required.
 * Sets `req.user`, `req.userId`, `req.token`, and `req.smsActor`.
 */
export const SmsMobileAuthMiddleware = async (
  req: SmsMobileRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const pathProfile = resolveMobileAuthProfileFromPath(req.originalUrl || req.path || '');
    const token = extractAccessToken(req, pathProfile ?? undefined);
    if (!token) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Authorization required');
    }

    const authService = Container.get(AuthService);
    const { userId, user } = await authService.validateToken(token);

    if (!user || user.deletedAt != null || !user.isActive) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Account is not active');
    }
    if (user.isBlocked) {
      throw new CustomException(403, 'ACCOUNT_BLOCKED', 'This account has been blocked');
    }

    const adminWithRole = await prisma.admin.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!adminWithRole) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Account not found');
    }

    req.token = token;
    req.userId = userId;
    req.user = adminWithRole;
    req.smsActor = await loadSmsActorForAdmin(userId, adminWithRole.role?.roleName);

    next();
  } catch (error) {
    next(error);
  }
};
