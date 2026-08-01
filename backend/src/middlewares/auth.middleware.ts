import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { CustomException } from '@/utils/exception';
import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import { AuthService } from '@/features/core/auth/service';
import { createAuditLog } from '@/features/system/audit-logs/service';
import { responseError } from '@/utils/api-response';
import { logger } from '@/logging/logger';
import { resolveClientIp, resolveUserAgent } from '@/utils/request-ip';
import md5 from 'md5';
import crypto from 'crypto';
import {
  cookieNamesForProfile,
  resolveConsoleAuthProfile,
} from '@/features/auth/auth-cookies';

const scrubSensitiveData = (data: any, sensitiveKeys: string[] = ['password', 'token', 'secret', 'refreshToken', 'authorization', 'cookie', 'creditcard']) => {
  if (!data || typeof data !== 'object') return data;

  const cleanData = Array.isArray(data) ? [...data] : { ...data };

  Object.keys(cleanData).forEach(key => {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      (cleanData as any)[key] = '[REDACTED]';
    } else if (typeof (cleanData as any)[key] === 'object') {
      // Recursively scrub nested objects
      (cleanData as any)[key] = scrubSensitiveData((cleanData as any)[key], sensitiveKeys);
    }
  });

  return cleanData;
};

/**
 * UUID, 8+ hex char, or pure numeric — matches the trailing-ID conventions
 * used across the app (e.g. `POST /app-settings/:id` for updates).
 */
const ID_TAIL_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{12,}|[0-9]+)$/i;

type AuditType = 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'DOWNLOAD' | 'OTHER';

/**
 * Choose the correct audit type for an authenticated request.
 *
 * Plain HTTP-verb mapping is wrong for this app because most updates are
 * `POST /resource/:id`, not `PUT`. The classifier uses URL hints alongside
 * the method so saves are logged as UPDATE, deletes as DELETE, etc.
 */
const classifyAuditType = (req: Request): AuditType => {
  const url = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
  const method = req.method.toUpperCase();
  const segments = url.split('/').filter(Boolean);
  const tail = segments[segments.length - 1] || '';
  const looksLikeId = ID_TAIL_REGEX.test(tail);

  if (url.includes('/upload') || url.includes('/files/')) return 'UPLOAD';
  if (url.includes('/download') || url.includes('/export')) return 'DOWNLOAD';
  if (method === 'DELETE' || url.includes('/delete/') || url.endsWith('/delete')) return 'DELETE';

  switch (method) {
    case 'POST':
      // `POST /resource/:id` is this app's "update" convention.
      return looksLikeId ? 'UPDATE' : 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    default:
      return 'OTHER';
  }
};

/**
 * Reduce a noisy URL like `/console/app-settings/abc-123-def?query=1`
 * to a stable, groupable resource name like `app-settings`.
 */
const deriveResource = (req: Request): string => {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  const parts = url.split('/').filter(Boolean);
  if (parts[0] === 'console' || parts[0] === 'api') parts.shift();

  // Strip a trailing ID-like segment so similar requests bucket together.
  const last = parts[parts.length - 1] || '';
  if (last && ID_TAIL_REGEX.test(last)) parts.pop();

  return parts.join('/') || 'unknown';
};

/**
 * Skip generic middleware audit rows for very high-frequency conversation
 * calls. Message bodies and read cursors are persisted in `Message` /
 * `ConversationParticipant`; duplicating every keystroke in `AuditLog`
 * overwhelms the UI and retention jobs without adding much security signal.
 * Structural actions (DM/broadcast start, participant changes, delete thread)
 * are still audited.
 */
const shouldSkipMiddlewareAuditForChatNoise = (req: Request): boolean => {
  const url = (req.originalUrl || req.url || '').split('?')[0].toLowerCase();
  if (!url.includes('/conversations/')) return false;
  const m = req.method.toUpperCase();
  if (m === 'POST' && /\/conversations\/[^/]+\/(messages|read)(\/|$)/.test(url)) return true;
  return false;
};

export const AuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const names = cookieNamesForProfile(resolveConsoleAuthProfile(req));
    const accessToken = req.cookies[names.access] as string | undefined;
    const refreshToken = req.cookies[names.refresh] as string | undefined;

    if (!refreshToken) throw new CustomException(401, 'INVALID_TOKEN', 'Please login first');

    // Resolve AuthService from the Container
    const authService = Container.get(AuthService);
    const { userId, user } = await authService.validateToken(accessToken);

    req.token = accessToken;
    req.userId = userId;
    req.user = user;

    // Only audit mutating verbs — GETs are too noisy.
    if (
      (req.method === 'POST' ||
        req.method === 'PUT' ||
        req.method === 'PATCH' ||
        req.method === 'DELETE') &&
      !shouldSkipMiddlewareAuditForChatNoise(req)
    ) {
      const sanitizedBody = scrubSensitiveData(req.body);
      // Fire-and-forget: don't block request latency.
      void createAuditLog({
        type: classifyAuditType(req),
        severity: 'INFO',
        userId: user.id || 'anonymous',
        userEmail: user.username || 'anonymous',
        action: `${req.method} ${req.originalUrl}`,
        resource: deriveResource(req),
        ipAddress: resolveClientIp(req) || undefined,
        userAgent: resolveUserAgent(req) || undefined,
        details: JSON.stringify(sanitizedBody),
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const MasterProtector = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const headerKey = req.headers['www-authenticate'];
    const expected = process.env.MASTER_PROTECTOR_KEY;

    // Require explicit configuration. This prevents shipping a hardcoded backdoor token.
    if (!expected) {
      logger.warn('MASTER_PROTECTOR_KEY is not set; denying MasterProtector');
      return responseError(res, 401, { code: '401', message: 'Unauthorized' });
    }

    const provided = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const ok =
      typeof provided === 'string' &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

    if (!ok) {
      return responseError(res, 401, {
        code: '401',
        message: 'Unauthorized',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const RegisterAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return next(new CustomException(410, 'GONE', 'Register flow removed'));
};

export const ResetAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return next(new CustomException(410, 'GONE', 'Reset flow removed'));
};
