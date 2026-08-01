import { NextFunction, Response } from 'express';
import { Container } from 'typedi';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { responseError } from '@/utils/api-response';
import { CaptiveJwtService } from '@/features/captive/services/jwt';
import { CaptiveClientAuthService } from '@/features/captive/auth/service';
import {
  CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS,
  captiveAuthCookieOptionsStrict,
} from '@/features/captive/services/cookie-options';
import { AUTH_COOKIE_NAMES } from '@/features/auth/auth-cookies';

export const CaptiveClientAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accessName = AUTH_COOKIE_NAMES.captive.access;
    const refreshName = AUTH_COOKIE_NAMES.captive.refresh;
    const accessToken = req.cookies[accessName] as string | undefined;
    const refreshToken = req.cookies[refreshName] as string | undefined;

    if (!refreshToken) {
      responseError(res, 401, { code: '401', message: 'Unauthorized' });
      return;
    }

    const verification = CaptiveJwtService.verifyTokenAndRefresh(accessToken, refreshToken);

    if (verification.payload == null) {
      responseError(res, 401, { code: '401', message: 'Unauthorized' });
      return;
    }

    const authService = Container.get(CaptiveClientAuthService);
    const credential = await authService.validateCredential(verification.payload.credentialId);

    if (credential == null) {
      responseError(res, 401, { code: '401', message: 'Invalid Credential' });
      return;
    }

    req.credentialId = verification.payload.credentialId;
    req.credential = credential;

    if (verification.newToken != null) {
      res.cookie(accessName, verification.newToken, {
        ...captiveAuthCookieOptionsStrict(),
        maxAge: CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
