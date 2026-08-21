import { Request, Response } from 'express';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { CustomException } from '@/utils/exception';
import { comparePassword } from '@/utils/password';
import { resolveCaptiveClientIp, resolveCaptiveClientMac } from '@/features/captive/utils/captive-client-ip';
import PrismaDBConnection from '@/prisma/prisma-client';
import { CredentialStatus, CredentialType } from '@/generated/prisma/client';
import type { AuthenticatedRequest } from '@/interfaces/express.interface';
import { logger } from '@/logging/logger';
import { CaptiveJwtService } from '@/features/captive/services/jwt';
import {
  CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS,
  CAPTIVE_REFRESH_COOKIE_MAX_AGE_MS,
  captiveAuthCookieOptions,
} from '@/features/captive/services/cookie-options';
import { AUTH_COOKIE_NAMES } from '@/features/auth/auth-cookies';
import {
  captiveDeviceLimitReached,
  captiveErrors,
  captiveSuccess,
} from '@/features/captive/messages';
import { CaptiveLoginSchema } from './schema';
import { captiveLoginCredentialInclude, runCaptiveLoginGuards } from './login-guards';
import { recordCaptivePortalSession } from '@/features/captive/services/captive-portal-session.service';
import {
  computeCredentialDataRemainingMb,
  computeCredentialTimeRemainingSec,
  planTimeQuotaSec,
  resolveActivationExpiresAt,
} from '@/features/shared/credentials/credential-sync.helpers';

const prisma = PrismaDBConnection.getConnection();

const cookieOptions = captiveAuthCookieOptions();
const portalAccessCookie = AUTH_COOKIE_NAMES.captive.access;
const portalRefreshCookie = AUTH_COOKIE_NAMES.captive.refresh;

function mapLoginGuardError(error: unknown): never {
  const code = (error as { code?: string }).code;
  const maxDevices = (error as { maxDevices?: number }).maxDevices;

  switch (code) {
    case 'RADIUS_SESSION_ACTIVE':
      throw new CustomException(400, 'RADIUS_SESSION_ACTIVE', captiveErrors.RADIUS_SESSION_ACTIVE);
    case 'CREDENTIAL_CONSUMED':
      throw new CustomException(400, 'CREDENTIAL_CONSUMED', captiveErrors.CREDENTIAL_CONSUMED);
    case 'NO_DATA_REMAINING':
      throw new CustomException(400, 'NO_DATA_REMAINING', captiveErrors.NO_DATA_REMAINING);
    case 'DEVICE_LIMIT_REACHED':
      throw new CustomException(
        400,
        'DEVICE_LIMIT_REACHED',
        captiveDeviceLimitReached(maxDevices ?? 1),
      );
    case 'INVALID_CREDENTIAL':
      throw new CustomException(400, 'INVALID_CREDENTIAL', captiveErrors.INVALID_CREDENTIAL);
    case 'TOKEN_SITE_MISMATCH':
      throw new CustomException(400, 'TOKEN_SITE_MISMATCH', captiveErrors.TOKEN_SITE_MISMATCH);
    case 'TOKEN_LOCATION_UNKNOWN':
      throw new CustomException(400, 'TOKEN_LOCATION_UNKNOWN', captiveErrors.TOKEN_LOCATION_UNKNOWN);
    case 'TOKEN_LOCATION_AMBIGUOUS':
      throw new CustomException(
        400,
        'TOKEN_LOCATION_AMBIGUOUS',
        captiveErrors.TOKEN_LOCATION_AMBIGUOUS,
      );
    default:
      // Do not mask DB / unexpected guard failures as "wrong token".
      logger.error(
        `Captive login guard failed code=${code ?? 'unknown'}: ${(error as Error)?.message ?? error}`,
      );
      throw new CustomException(500, 'INTERNAL_SERVER_ERROR', captiveErrors.INTERNAL_SERVER_ERROR);
  }
}

async function verifyCredentialPassword(plainPassword: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return false;
  if (await comparePassword(plainPassword, passwordHash)) return true;
  return plainPassword === passwordHash;
}

export class CaptiveAuthController {
  public login = [
    ValidationMiddleware(CaptiveLoginSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const where: { deletedAt: null; username?: string; token?: string } = { deletedAt: null };

      if (req.body.type === CredentialType.USER_PASSWORD) {
        where.username = String(req.body.username ?? '').trim();
      } else {
        where.token = String(req.body.token ?? '').trim().toUpperCase();
      }

      let credential = await prisma.credential.findFirst({
        where,
        include: captiveLoginCredentialInclude,
      });

      if (!credential) {
        throw new CustomException(400, 'INVALID_CREDENTIAL', captiveErrors.INVALID_CREDENTIAL);
      }

      if (
        req.body.type === CredentialType.USER_PASSWORD &&
        !(await verifyCredentialPassword(String(req.body.password ?? ''), credential.passwordHash))
      ) {
        throw new CustomException(400, 'INVALID_CREDENTIAL', captiveErrors.INVALID_CREDENTIAL);
      }

      if (credential.status === CredentialStatus.PAUSED) {
        throw new CustomException(400, 'CREDENTIAL_PAUSED', captiveErrors.CREDENTIAL_PAUSED);
      }

      if (
        credential.status === CredentialStatus.EXPIRED ||
        credential.status === CredentialStatus.CONSUMED ||
        credential.status === CredentialStatus.REVOKED
      ) {
        throw new CustomException(400, 'CREDENTIAL_INACTIVE', captiveErrors.CREDENTIAL_INACTIVE);
      }

      if (credential.expiresAt && credential.expiresAt < new Date()) {
        throw new CustomException(400, 'CREDENTIAL_EXPIRED', captiveErrors.CREDENTIAL_EXPIRED);
      }

      // First captive login: SOLD → ACTIVATED (matches FreeRADIUS post-auth).
      const shouldMarkActivated = credential.status === CredentialStatus.SOLD;

      if (shouldMarkActivated || !credential.activatedAt) {
        if (
          shouldMarkActivated ||
          credential.status === CredentialStatus.ACTIVATED
        ) {
          const activatedAt = credential.activatedAt ?? new Date();
          const expiresAt = resolveActivationExpiresAt(
            activatedAt,
            credential.plan?.validityDays,
            credential.expiresAt,
          );
          const quotaSec = planTimeQuotaSec(credential.plan);
          await prisma.credential.update({
            where: { id: credential.id },
            data: {
              ...(shouldMarkActivated
                ? { status: CredentialStatus.ACTIVATED }
                : {}),
              activatedAt,
              ...(expiresAt && !credential.expiresAt ? { expiresAt } : {}),
              ...(quotaSec != null && credential.timeRemainingSec == null
                ? { timeRemainingSec: quotaSec }
                : {}),
            },
          });
        }
      }

      const refreshed = await prisma.credential.findUnique({
        where: { id: credential.id },
        include: captiveLoginCredentialInclude,
      });
      if (refreshed) {
        credential = refreshed;
      }

      const nasParamsBody =
        req.body?.nasParams != null && typeof req.body.nasParams === 'object'
          ? (req.body.nasParams as Record<string, unknown>)
          : null;
      const clientMac = resolveCaptiveClientMac(req, nasParamsBody) ?? null;

      try {
        await runCaptiveLoginGuards(credential, { clientMac, nasParams: nasParamsBody });
      } catch (error) {
        mapLoginGuardError(error);
      }

      // Keep remaining-time / remaining-data cache aligned so FreeRADIUS/dashboard stay consistent.
      if (credential.plan) {
        const remainingSec = await computeCredentialTimeRemainingSec(credential, credential.plan);
        const remainingMb = await computeCredentialDataRemainingMb(credential, credential.plan);
        const patch: { timeRemainingSec?: number; dataRemainingMb?: number } = {};
        if (remainingSec != null && remainingSec !== credential.timeRemainingSec) {
          patch.timeRemainingSec = remainingSec;
        }
        if (remainingMb != null && remainingMb !== credential.dataRemainingMb) {
          patch.dataRemainingMb = remainingMb;
        }
        if (Object.keys(patch).length > 0) {
          await prisma.credential.update({
            where: { id: credential.id },
            data: patch,
          });
          credential = { ...credential, ...patch };
        }
      }

      const radiusUserName = credential.username ?? credential.token ?? '';

      await prisma.wifiAuditLog.create({
        data: {
          orgId: credential.orgId,
          action: 'AUTH_SUCCESS',
          entity: 'credential',
          entityId: credential.id,
          meta: {
            username: radiusUserName,
            reply: 'Access-Accept',
            CallingStationId: clientMac,
            CalledStationId: (req.headers['x-called-station-id'] as string) ?? undefined,
          },
          ip: resolveCaptiveClientIp(req, nasParamsBody) ?? undefined,
          userAgent: req.headers['user-agent'] ?? undefined,
        },
      });

      const accessToken = CaptiveJwtService.createAccessToken(credential.id);
      const refreshToken = CaptiveJwtService.createRefreshToken(credential.id);

      res.cookie(portalAccessCookie, accessToken, {
        ...cookieOptions,
        maxAge: CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS,
      });
      res.cookie(portalRefreshCookie, refreshToken, {
        ...cookieOptions,
        maxAge: CAPTIVE_REFRESH_COOKIE_MAX_AGE_MS,
      });

      await recordCaptivePortalSession({
        orgId: credential.orgId,
        credentialId: credential.id,
        username: radiusUserName,
        req,
        bodyNasParams: req.body?.nasParams,
      });

      responseSuccess(res, {
        message: captiveSuccess.LOGIN,
        data: { ok: true },
      });
    }),
  ];

  public logout = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const credentialId = req.credentialId ?? req.credential?.id;
        if (credentialId) {
          const cred =
            req.credential ??
            (await prisma.credential.findUnique({
              where: { id: credentialId },
              select: { id: true, orgId: true, username: true, token: true },
            }));

          if (cred) {
            const radiusUserName = cred.username ?? cred.token ?? '';
            const session = await prisma.captivePortalSession.findFirst({
              where: { credentialId: cred.id },
              orderBy: { createdAt: 'desc' },
              select: { nasParams: true },
            });
            const nasParams =
              session?.nasParams != null && typeof session.nasParams === 'object'
                ? (session.nasParams as Record<string, unknown>)
                : null;

            await prisma.wifiAuditLog.create({
              data: {
                orgId: cred.orgId,
                action: 'AUTH_LOGOUT',
                entity: 'credential',
                entityId: cred.id,
                meta: {
                  username: radiusUserName,
                  reply: 'Disconnect',
                  CallingStationId: resolveCaptiveClientMac(req, nasParams),
                  CalledStationId: (req.headers['x-called-station-id'] as string) ?? undefined,
                },
                ip: resolveCaptiveClientIp(req, nasParams) ?? undefined,
                userAgent: req.headers['user-agent'] ?? undefined,
              },
            });
          }
        }

        res.clearCookie(portalAccessCookie, cookieOptions);
        res.clearCookie(portalRefreshCookie, cookieOptions);

        responseSuccess(res, { message: captiveSuccess.LOGOUT, data: {} });
      } catch (error) {
        logger.error((error as Error).message);
        responseError(res, 500, { code: '500', message: captiveErrors.INTERNAL_SERVER_ERROR });
      }
    }),
  ];

  public saveSession = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const credentialId = req.credentialId ?? req.credential?.id;
      const credential = req.credential;
      if (!credentialId || !credential) {
        throw new CustomException(401, 'UNAUTHORIZED', captiveErrors.UNAUTHORIZED);
      }

      const nasParams = req.body?.nasParams ?? null;
      if (nasParams == null || typeof nasParams !== 'object') {
        throw new CustomException(400, 'INVALID_PAYLOAD', captiveErrors.INVALID_PAYLOAD);
      }

      const username = credential.username ?? credential.token ?? '';
      await recordCaptivePortalSession({
        orgId: credential.orgId,
        credentialId,
        username,
        req,
        bodyNasParams: nasParams,
      });

      responseSuccess(res, { message: captiveSuccess.SESSION_SAVED, data: { ok: true } });
    }),
  ];

  public getSession = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const credentialId = req.credentialId ?? req.credential?.id;
      if (!credentialId) {
        throw new CustomException(401, 'UNAUTHORIZED', captiveErrors.UNAUTHORIZED);
      }

      const session = await prisma.captivePortalSession.findFirst({
        where: { credentialId },
        orderBy: { createdAt: 'desc' },
      });

      if (!session) {
        responseSuccess(res, { message: captiveSuccess.SESSION_NONE, data: null });
        return;
      }

      responseSuccess(res, {
        message: captiveSuccess.OK,
        data: {
          username: session.username,
          nasParams: session.nasParams as Record<string, unknown>,
        },
      });
    }),
  ];

  public checkServer = [
    asyncController(async (_req: Request, res: Response): Promise<void> => {
      responseSuccess(res, {
        message: captiveSuccess.SERVER_RUNNING,
        data: { status: 'ok', timestamp: new Date() },
      });
    }),
  ];
}
