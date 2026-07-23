import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { SECRET_KEY } from '@/config';

interface TokenPayload extends JwtPayload {
  credentialId: string;
}

/** Share SECRET_KEY with console auth; refresh uses a derived secret. */
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET?.trim() || SECRET_KEY;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET?.trim() || `${SECRET_KEY}:captive-refresh`;

export class CaptiveJwtService {
  static createAccessToken(credentialId: string): string {
    return jwt.sign({ credentialId }, ACCESS_SECRET, { expiresIn: '1d' });
  }

  static createRefreshToken(credentialId: string): string {
    return jwt.sign({ credentialId }, REFRESH_SECRET, { expiresIn: '365d' });
  }

  static verifyTokenAndRefresh(
    token: string | undefined,
    refreshToken: string,
  ): { payload: TokenPayload | null; newToken: string | null } {
    try {
      if (!token) throw new TokenExpiredError('expired', new Date());
      const payload = jwt.verify(token, ACCESS_SECRET) as TokenPayload;
      return { payload, newToken: null };
    } catch {
      this.decodeAccessTokenAllowExpired(token ?? '');
      const refreshPayload = this.verifyRefreshToken(refreshToken);
      if (!refreshPayload?.credentialId) {
        return { payload: null, newToken: null };
      }

      const newToken = this.createAccessToken(refreshPayload.credentialId);
      const payload = jwt.verify(newToken, ACCESS_SECRET) as TokenPayload;
      return { payload, newToken };
    }
  }

  static decodeAccessTokenAllowExpired(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, ACCESS_SECRET, { ignoreExpiration: true }) as TokenPayload;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
}
