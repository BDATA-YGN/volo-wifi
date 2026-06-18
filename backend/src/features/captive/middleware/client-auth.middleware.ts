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

export const CaptiveClientAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accessToken = req.cookies.access_token as string | undefined;
    const refreshToken = req.cookies.refresh_token as string | undefined;

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
      res.cookie('access_token', verification.newToken, {
        ...captiveAuthCookieOptionsStrict(),
        maxAge: CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
