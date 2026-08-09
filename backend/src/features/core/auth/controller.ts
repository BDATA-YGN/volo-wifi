import { Response, Request, NextFunction } from 'express';
import { Container } from 'typedi';
import { responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { LoginSchema, LogoutSchema, ChangePasswordSchema } from './schema';
import { Location, ValidationMiddleware } from '@/middlewares/validation.middleware';
import { CustomException, InvalidPayloadException } from '@/utils/exception';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { JwtService } from '@/utils/jwt';
import { comparePassword, hashPassword } from '@/utils/password';
import { WebSocketService } from "@/third-party/bdataSocket";
import cookieOptions from "@/lib/cookies";
import * as lzString from 'lz-string';
import dayjs from 'dayjs';


import { Admin, AdminToken, MapRoleSettings, MngRoleSettings } from '@/generated/prisma/client';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { BROADCAST_EVENTS } from '@/third-party/bdataSocket/sioConstants';
import PrismaDBConnection from '@/prisma/prisma-client';
import { createAuditLog } from '@/features/system/audit-logs/service';
import { recordLogin } from '@/features/core/auth/login-log.service';
import {
  assertLoginNotLocked,
  loadLoginLockPolicy,
  recordFailedLoginAttempt,
} from '@/features/core/auth/login-lockout.service';
import { resolveClientIp, resolveRequestClientIp, resolveUserAgent } from '@/utils/request-ip';
import { assertOrgMembershipAllowsConsoleAccess } from '@/features/wifi/shared/org-membership-auth';
import {
  cookieNamesForProfile,
  resolveConsoleAuthProfile,
} from '@/features/auth/auth-cookies';
import { invalidateAdminSessions } from '@/features/mobile/v1/auth/auth.security';
const prisma = PrismaDBConnection.getConnection();

const extraRolesAndMenus = (mapRoleSettings: any) => {
  const roleMenuMapping: Record<
    string,
    { visibility: boolean; access: boolean }
  > = {};

  mapRoleSettings.forEach(({ settingKey, enable, visibility }) => {
    roleMenuMapping[settingKey] = {
      visibility,
      access: enable,
    };
  });

  return roleMenuMapping;
};

/** Matches frontend Sidebar/TopMenu developer bypass — must receive full menus cookie for Next middleware. */
function isDeveloperAdmin(user: Admin & { role?: { roleName?: string | null } | null }): boolean {
  const name = user.role?.roleName;
  return typeof name === 'string' && name.toLowerCase() === 'developer';
}

export class Controller {
  private adminTokenService = Container.get<BaseService<AdminToken, any>>('adminTokenService');
  private adminService = Container.get<BaseService<Admin, any>>('adminService');
  private mapRoleSettingsService = Container.get<BaseService<MapRoleSettings, any>>('mapRoleSettingsService');
  private mngRoleSettingsService = Container.get<BaseService<MngRoleSettings, any>>('mngRoleSettingsService');
  // private emailAccountService = Container.get<BaseService<EmailAccount, any>>('emailAccountService');
  private jwtService = Container.get(JwtService);
  private socketService = WebSocketService.getInstance();

  private createToken = async (adminId: string): Promise<{ token: string, refreshToken: string }> => {
    const [token, refreshToken] = await Promise.all([this.jwtService.createToken(), this.jwtService.createRefreshToken()]);
    const newToken: AdminToken = await this.adminTokenService.create({ adminId, token, refreshToken, isValid: true });
    return { token: newToken.token, refreshToken: newToken.refreshToken };
  };

  public login = [
    ValidationMiddleware(LoginSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const request = req.body;
      const profile = resolveConsoleAuthProfile(req);
      const names = cookieNamesForProfile(profile);
      const checkUser: Admin = await this.adminService.findWithCustomKey('username', request.username);

      if (!checkUser || checkUser.deletedAt !== null || checkUser.isActive === false) {
        throw new CustomException(404, 'RESOURCE_NOT_FOUND', "User doesn't exist!");
      }

      if (checkUser.isBlocked) {
        throw new CustomException(403, 'ACCOUNT_BLOCKED', 'This account has been blocked.');
      }

      const lockPolicy = await loadLoginLockPolicy();
      await assertLoginNotLocked(checkUser.id, lockPolicy);

      const clientIp = resolveRequestClientIp(
        req,
        typeof request.clientIp === 'string' ? request.clientIp : null,
      );

      const isMatch = await comparePassword(request.password, checkUser.password);
      if (!isMatch) {
        await recordFailedLoginAttempt(
          checkUser.id,
          checkUser.username,
          req,
          lockPolicy,
          clientIp,
        );
      }

      const adminWithRole = await prisma.admin.findFirst({
        where: { id: checkUser.id, deletedAt: null },
        include: { role: true },
      });
      await assertOrgMembershipAllowsConsoleAccess(prisma, checkUser.id, adminWithRole);
      const userAgent = resolveUserAgent(req);

      const { token, refreshToken } = await this.createToken(checkUser.id);
      await this.adminService.update(checkUser.id, {
        lastLogin: new Date(),
        lastIp: clientIp || null,
        isOnline: true
      });

      const { accessMs: accessCookieMaxAge, refreshMs: refreshCookieMaxAge } =
        await this.jwtService.getSessionCookieMaxAges();
      const futureTimestamp = dayjs().add(accessCookieMaxAge, 'millisecond').valueOf();

      // Only touch this profile's cookies so /wifi and /partner can coexist.
      if (profile === 'admin') {
        res.clearCookie('menus', { ...cookieOptions });
      }
      res.cookie(names.access, token, { ...cookieOptions, maxAge: accessCookieMaxAge });
      res.cookie(names.refresh, refreshToken, { ...cookieOptions, maxAge: refreshCookieMaxAge });

      this.socketService.broadcast(
        BROADCAST_EVENTS.FETCH_ADMINS,
        { message: 'A new user logged in', timestamp: new Date() },
      );

      // Fire-and-forget: a failed history write must not break sign-in.
      void recordLogin({
        userId: checkUser.id,
        userEmail: checkUser.username,
        type: 'LOGIN',
        req,
        ipAddress: clientIp,
      });
      void createAuditLog({
        type: 'LOGIN',
        severity: 'INFO',
        userId: checkUser.id,
        userEmail: checkUser.username,
        action: `${req.method} ${req.originalUrl}`,
        resource: 'auth/login',
        ipAddress: clientIp || undefined,
        userAgent: userAgent || undefined,
        details: JSON.stringify({ username: checkUser.username, authApp: profile }),
      });

      responseSuccess(res, {
        message: 'Success', data: {
          maxAge: futureTimestamp
        }
      });
    }),
  ];

  public me = [
    asyncController(async (req: AuthenticatedRequest, res: Response) => {
      // req.userId
      const user = req.user as Admin & { role?: { roleName?: string | null } | null };

      if (!user) {
        throw new CustomException(404, 'RESOURCE_NOT_FOUND', "User doesn't exist!");
      }

      let fetchRoles: (MapRoleSettings & { mngRoleSettings: MngRoleSettings })[];

      // Super admin and Developer role get all role-setting rows (Next.js `menus` cookie + route gate).
      if (user.isSuper === true || isDeveloperAdmin(user)) {
        const fetchAllMenus = await this.mngRoleSettingsService.baseModel().findMany();
        fetchRoles = fetchAllMenus.map((menu: any) => {
          return {
            id: menu.id,
            roleId: user.roleId,
            visibility: true,
            enable: true,
            mngRoleSettings: {
              ...menu,
            },
          };
        });
      } else {
        fetchRoles = await this.mapRoleSettingsService.findWithCustomKey(
          'roleId',
          user.roleId,
          { mngRoleSettings: { where: { deletedAt: null, level: "app" } } },
          true,
        );
      }

      // Fetch email account if user has one
      const emailAccount = null;
      if (user.emailAccountId) {
        // emailAccount = await this.emailAccountService.findById(user.emailAccountId);
      }

      if (emailAccount !== null) {
        delete emailAccount.password;
      }
      delete user.password;

      const resp = {
        ...user,
        emailAccount,
        mapRoleSettings: fetchRoles.filter(r => r.mngRoleSettings !== null).map(role => ({
          id: role.id,
          roleId: role.roleId,
          settingKey: role.mngRoleSettings?.settingKey,
          enable: role.enable,
          visibility: role.visibility,
        })),
      };
      const permissions = extraRolesAndMenus(resp.mapRoleSettings);
      const jsonString = JSON.stringify(permissions);
      const compressed = lzString.compressToEncodedURIComponent(jsonString);
      const { refreshMs: menusCookieMaxAge } = await this.jwtService.getSessionCookieMaxAges();
      // Partner app does not use console menu RBAC cookies.
      if (resolveConsoleAuthProfile(req) === 'admin') {
        res.cookie('menus', compressed, { ...cookieOptions, maxAge: menusCookieMaxAge });
      }
      responseSuccess(res, { message: 'success', data: resp });
    }),
  ];

  public logout = [
    asyncController(async (req: AuthenticatedRequest, res: Response) => {
      const profile = resolveConsoleAuthProfile(req);
      const names = cookieNamesForProfile(profile);
      const token = req.cookies[names.access] as string | undefined;

      if (!token) {
        throw new CustomException(401, 'INVALID_TOKEN', 'Please login first');
      }

      const checkUser: AdminToken = await this.adminTokenService.findWithCustomKey('token', token);

      if (!checkUser) {
        throw new CustomException(404, 'RESOURCE_NOT_FOUND', "Token doesn't exist!");
      }

      // Resolve username for the audit row before we tear the session down.
      const admin: Admin | null = await this.adminService.findById(checkUser.adminId);

      await this.adminTokenService.update(checkUser.id, { isValid: false, updatedAt: new Date(), deletedAt: new Date() });
      await this.adminService.update(checkUser.adminId, {
        isOnline: false
      });

      // Clear only this profile's cookies so sibling sessions stay intact.
      res.clearCookie(names.access, { ...cookieOptions });
      res.clearCookie(names.refresh, { ...cookieOptions });
      if (profile === 'admin') {
        res.clearCookie('menus', { ...cookieOptions });
      }

      // Fire-and-forget audit + sign-in history rows.
      void recordLogin({
        userId: checkUser.adminId,
        userEmail: admin?.username || null,
        type: 'LOGOUT',
        req,
      });
      void createAuditLog({
        type: 'LOGOUT',
        severity: 'INFO',
        userId: checkUser.adminId,
        userEmail: admin?.username || 'unknown',
        action: `${req.method} ${req.originalUrl}`,
        resource: 'auth/logout',
        ipAddress: resolveClientIp(req) || undefined,
        userAgent: resolveUserAgent(req) || undefined,
        details: JSON.stringify({ authApp: profile }),
      });

      responseSuccess(res, { message: 'success' });
    }),
  ];

  public changePassword = [
    ValidationMiddleware(ChangePasswordSchema),
    asyncController(async (req: AuthenticatedRequest, res: Response) => {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const adminId = req.userId!;
      const admin = await this.adminService.findById(adminId);
      if (!admin?.password) {
        throw new CustomException(401, 'INVALID_CREDENTIALS', 'Please login first');
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
      await this.adminService.update(adminId, {
        password: hashed,
        updatedBy: admin.username,
      });

      const profile = resolveConsoleAuthProfile(req);
      const names = cookieNamesForProfile(profile);
      const accessToken = req.cookies[names.access] as string | undefined;
      const currentRecord = accessToken
        ? await this.adminTokenService.findWithCustomKey('token', accessToken)
        : null;

      await invalidateAdminSessions(prisma, adminId, {
        exceptTokenId: currentRecord?.id,
      });

      void createAuditLog({
        type: 'UPDATE',
        severity: 'INFO',
        userId: adminId,
        userEmail: admin.username,
        action: `${req.method} ${req.originalUrl}`,
        resource: 'auth/change-password',
        ipAddress: resolveClientIp(req) || undefined,
        userAgent: resolveUserAgent(req) || undefined,
        details: JSON.stringify({ authApp: profile }),
      });

      responseSuccess(res, {
        message: 'Password updated successfully. Other signed-in devices have been signed out.',
        data: {},
      });
    }),
  ];

  public refreshToken = asyncController(async (req: Request, res: Response): Promise<void> => {
    const profile = resolveConsoleAuthProfile(req);
    const names = cookieNamesForProfile(profile);
    const refreshTokenFromCookie = req.cookies[names.refresh] as string | undefined;

    if (!refreshTokenFromCookie) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Refresh token missing');
    }

    const record = await prisma.adminToken.findFirst({
      where: {
        refreshToken: refreshTokenFromCookie
      }
    });

    if (!record) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Invalid Refresh Token');
    }

    if (!(await this.jwtService.isValid(record.refreshToken))) {
      throw new CustomException(401, 'REFRESH_TOKEN_EXPIRE', 'Refresh Token Expire');
    }

    const adminWithRole = await prisma.admin.findFirst({
      where: { id: record.adminId, deletedAt: null },
      include: { role: true },
    });
    if (!adminWithRole || !adminWithRole.isActive || adminWithRole.isBlocked) {
      throw new CustomException(401, 'INVALID_TOKEN', 'Account is not active');
    }
    await assertOrgMembershipAllowsConsoleAccess(prisma, record.adminId, adminWithRole);

    const [token, newRefreshToken] = await Promise.all([this.jwtService.createToken(), this.jwtService.createRefreshToken()]);

    await this.adminTokenService.update(record.id, { token, refreshToken: newRefreshToken, isValid: true });

    const { accessMs: accessCookieMaxAge, refreshMs: refreshCookieMaxAge } =
      await this.jwtService.getSessionCookieMaxAges();
    const futureTimestamp = dayjs().add(accessCookieMaxAge, 'millisecond').valueOf();

    res.cookie(names.access, token, { ...cookieOptions, maxAge: accessCookieMaxAge });
    res.cookie(names.refresh, newRefreshToken, { ...cookieOptions, maxAge: refreshCookieMaxAge });

    responseSuccess(res, { message: 'Success', data: { maxAge: futureTimestamp } });
  });
}

