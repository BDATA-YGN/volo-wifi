import { Request, Response } from 'express';
import { Container } from 'typedi';
import cookieOptions from '@/lib/cookies';
import { cookieNamesForProfile, type AuthAppProfile } from '@/features/auth/auth-cookies';
import { asyncController } from '@/utils/async-controller';
import { responseSuccess } from '@/utils/api-response';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { CustomException } from '@/utils/exception';
import { comparePassword, hashPassword } from '@/utils/password';
import { JwtService } from '@/utils/jwt';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import type { Admin, AdminToken } from '@/generated/prisma/client';
import type { AuthenticatedRequest } from '@/interfaces/express.interface';
import PrismaDBConnection from '@/prisma/prisma-client';
import { recordLogin } from '@/features/core/auth/login-log.service';
import {
  assertLoginNotLocked,
  loadLoginLockPolicy,
  recordFailedLoginAttempt,
} from '@/features/core/auth/login-lockout.service';
import { resolveClientIp } from '@/utils/request-ip';
import { extractRefreshToken } from '@/features/mobile/shared/utils/token';
import {
  MobileDeviceMiddleware,
  smsMobileProtectedChain,
  SmsMobileAuthMiddleware,
} from '@/features/mobile/shared/middleware';
import type { SmsMobileRequest } from '@/features/mobile/shared/types/mobile-request';
import { loadSmsActorForAdmin } from '@/features/mobile/shared/resolve-actor';
import { serializeAdminBrief } from '@/features/mobile/shared/serializers';
import dayjs from 'dayjs';
import { INVALID_CREDENTIALS_MESSAGE } from './auth.constants';
import {
  assertAdminCanAuthenticate,
  invalidateAdminSessions,
  loadActiveAdminWithRole,
  rejectInvalidCredentials,
  resolveMobileSessionProfile,
  validateRefreshTokenRecord,
} from './auth.security';
import {
  MobileAuthChangePasswordSchema,
  MobileAuthLoginSchema,
  MobileAuthRefreshSchema,
} from './schema';

const prisma = PrismaDBConnection.getConnection();

async function buildActorProfile(req: SmsMobileRequest) {
  const admin = req.user;
  const actor = req.smsActor;
  if (!actor) return null;

  return {
    actorType: actor.type,
    roleName: actor.roleName,
    admin: serializeAdminBrief(admin as unknown as Record<string, unknown>),
  };
}

export class MobileAuthController {
  private adminService = Container.get<BaseService<Admin, unknown>>('adminService');
  private adminTokenService = Container.get<BaseService<AdminToken, unknown>>('adminTokenService');
  private jwtService = Container.get(JwtService);

  private async createToken(adminId: string) {
    const [token, refreshToken] = await Promise.all([
      this.jwtService.createToken(),
      this.jwtService.createRefreshToken(),
    ]);
    await this.adminTokenService.create({ adminId, token, refreshToken, isValid: true });
    return { token, refreshToken };
  }

  private setSessionCookies(
    res: Response,
    profile: AuthAppProfile,
    token: string,
    refreshToken: string,
    accessMs: number,
    refreshMs: number,
  ) {
    const names = cookieNamesForProfile(profile);
    res.cookie(names.access, token, { ...cookieOptions, maxAge: accessMs });
    res.cookie(names.refresh, refreshToken, { ...cookieOptions, maxAge: refreshMs });
  }

  private clearSessionCookies(res: Response, profile: AuthAppProfile) {
    const names = cookieNamesForProfile(profile);
    res.clearCookie(names.access, cookieOptions);
    res.clearCookie(names.refresh, cookieOptions);
  }

  public login = [
    MobileDeviceMiddleware,
    ValidationMiddleware(MobileAuthLoginSchema),
    asyncController(async (req: Request, res: Response) => {
      const { username, password } = req.body as { username: string; password: string };
      const lockPolicy = await loadLoginLockPolicy();

      const checkUser = await this.adminService.findWithCustomKey('username', username);
      if (!checkUser) {
        await rejectInvalidCredentials(password);
      }

      const admin = await assertAdminCanAuthenticate(checkUser);
      await assertLoginNotLocked(admin.id, lockPolicy);

      const isMatch = await comparePassword(password, admin.password);
      if (!isMatch) {
        await recordFailedLoginAttempt(admin.id, admin.username, req, lockPolicy);
      }

      const adminWithRole = await prisma.admin.findUnique({
        where: { id: admin.id },
        include: { role: true },
      });
      if (!adminWithRole) {
        await rejectInvalidCredentials(password);
      }

      let smsActor;
      try {
        smsActor = await loadSmsActorForAdmin(adminWithRole.id, adminWithRole.role?.roleName);
      } catch (error) {
        if (error instanceof CustomException && error.code === 'FORBIDDEN') {
          throw new CustomException(
            403,
            'FORBIDDEN',
            'This login is for collector or customer mobile apps only.',
          );
        }
        throw error;
      }

      const actorType = smsActor.type;
      if (actorType !== 'collector' && actorType !== 'customer') {
        throw new CustomException(403, 'FORBIDDEN', 'This login is for collector or customer mobile apps only.');
      }

      const { token, refreshToken } = await this.createToken(admin.id);
      const { accessMs, refreshMs } = await this.jwtService.getSessionCookieMaxAges();

      await this.adminService.update(admin.id, {
        lastLogin: new Date(),
        lastIp: resolveClientIp(req) || null,
        isOnline: true,
      });

      void recordLogin({
        userId: admin.id,
        userEmail: admin.username,
        type: 'LOGIN',
        req,
      });

      const fakeReq = {
        user: adminWithRole,
        userId: adminWithRole.id,
        token,
        smsActor,
      } as unknown as SmsMobileRequest;

      const profile = await buildActorProfile(fakeReq);
      this.setSessionCookies(res, actorType, token, refreshToken, accessMs, refreshMs);

      responseSuccess(res, {
        message: 'Success',
        data: {
          accessToken: token,
          refreshToken,
          expiresAt: dayjs().add(accessMs, 'millisecond').toISOString(),
          profile,
        },
      });
    }),
  ];

  public me = [
    ...smsMobileProtectedChain,
    asyncController(async (req: SmsMobileRequest, res: Response) => {
      const profile = await buildActorProfile(req);
      if (!profile) {
        throw new CustomException(403, 'FORBIDDEN', 'Mobile profile is not available for this account.');
      }
      responseSuccess(res, { message: 'Success', data: profile });
    }),
  ];

  public logout = [
    SmsMobileAuthMiddleware,
    asyncController(async (req: AuthenticatedRequest, res: Response) => {
      let profile: AuthAppProfile = 'collector';
      try {
        profile = resolveMobileSessionProfile(req);
      } catch {
        // Best-effort cookie clear even when actor cannot be resolved.
      }

      if (req.token) {
        const record = await this.adminTokenService.findWithCustomKey('token', req.token);
        if (record?.isValid) {
          await this.adminTokenService.update(record.id, { isValid: false, updatedAt: new Date() });
        }
      }

      this.clearSessionCookies(res, profile);

      void recordLogin({
        userId: req.userId,
        userEmail: req.user?.username ?? '',
        type: 'LOGOUT',
        req,
      });

      responseSuccess(res, { message: 'Logout successful', data: {} });
    }),
  ];

  public refreshToken = [
    MobileDeviceMiddleware,
    ValidationMiddleware(MobileAuthRefreshSchema),
    asyncController(async (req: Request, res: Response) => {
      const profile = resolveMobileSessionProfile(req);
      const refreshToken = extractRefreshToken(req, profile);
      if (!refreshToken) {
        throw new CustomException(401, 'INVALID_TOKEN', 'Refresh token required');
      }

      const record = await validateRefreshTokenRecord(prisma, this.jwtService, refreshToken);
      const adminWithRole = await loadActiveAdminWithRole(prisma, record.adminId);

      try {
        await loadSmsActorForAdmin(adminWithRole.id, adminWithRole.role?.roleName);
      } catch {
        throw new CustomException(403, 'FORBIDDEN', 'This account is not enabled for the mobile app.');
      }

      const { token, refreshToken: newRefresh } = await this.createToken(record.adminId);
      await this.adminTokenService.update(record.id, { isValid: false, updatedAt: new Date() });

      const { accessMs, refreshMs } = await this.jwtService.getSessionCookieMaxAges();
      this.setSessionCookies(res, profile, token, newRefresh, accessMs, refreshMs);

      responseSuccess(res, {
        message: 'Success',
        data: {
          accessToken: token,
          refreshToken: newRefresh,
          expiresAt: dayjs().add(accessMs, 'millisecond').toISOString(),
        },
      });
    }),
  ];

  public changePassword = [
    ...smsMobileProtectedChain,
    ValidationMiddleware(MobileAuthChangePasswordSchema),
    asyncController(async (req: SmsMobileRequest, res: Response) => {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };

      const admin = await this.adminService.findById(req.userId);
      if (!admin?.password) {
        throw new CustomException(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
      }

      const isMatch = await comparePassword(currentPassword, admin.password);
      if (!isMatch) {
        throw new CustomException(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
      }

      if (currentPassword === newPassword) {
        throw new CustomException(
          400,
          'VALIDATION_ERROR',
          'New password must be different from the current password',
        );
      }

      const hashed = await hashPassword(newPassword);
      await this.adminService.update(req.userId, {
        password: hashed,
        updatedBy: req.user.username,
      });

      const currentRecord = req.token
        ? await this.adminTokenService.findWithCustomKey('token', req.token)
        : null;

      await invalidateAdminSessions(prisma, req.userId, {
        exceptTokenId: currentRecord?.id,
      });

      responseSuccess(res, {
        message: 'Password updated successfully. Other signed-in devices have been signed out.',
        data: {},
      });
    }),
  ];
}
