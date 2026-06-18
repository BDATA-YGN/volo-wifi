import { sign, verify } from 'jsonwebtoken';
import { Container, Inject, Service } from 'typedi';
import { SettingKey, SettingService } from '@/features/core/settings';

@Service()
export class JwtService {
  private settingSrv: SettingService;

  constructor() {
    // Lazy injection of SettingService to avoid circular dependencies.
    this.settingSrv = Container.get(SettingService);
  }

  async createToken(): Promise<string> {
    const { v4: uuid } = await import('uuid');
    const [JWT_SECRET_KEY, TOKEN_EXPIRE_DURATION] = await Promise.all([
      this.settingSrv.get(SettingKey.JWT_SECRET_KEY),
      this.settingSrv.get(SettingKey.TOKEN_EXPIRE_DURATION),
    ]);

    const expiresIn: number = TOKEN_EXPIRE_DURATION / 1000;

    return sign({ jti: uuid() }, JWT_SECRET_KEY, { expiresIn, algorithm: 'HS256' });
  }

  async createRefreshToken(): Promise<string> {
    const { v4: uuid } = await import('uuid');
    const [JWT_SECRET_KEY, REFRESH_TOKEN_EXPIRE_DURATION] = await Promise.all([
      this.settingSrv.get(SettingKey.JWT_SECRET_KEY),
      this.settingSrv.get(SettingKey.REFRESH_TOKEN_EXPIRE_DURATION),
    ]);

    const expiresIn: number = REFRESH_TOKEN_EXPIRE_DURATION / 1000;

    return sign({ jti: uuid() }, JWT_SECRET_KEY, { expiresIn, algorithm: 'HS256' });
  }

  /** Millisecond max-age for HTTP-only session cookies (aligned with JWT expiry settings). */
  async getSessionCookieMaxAges(): Promise<{ accessMs: number; refreshMs: number }> {
    const [accessMs, refreshMs] = await Promise.all([
      this.settingSrv.get(SettingKey.TOKEN_EXPIRE_DURATION),
      this.settingSrv.get(SettingKey.REFRESH_TOKEN_EXPIRE_DURATION),
    ]);
    return { accessMs, refreshMs };
  }

  async isValid(token: string): Promise<boolean> {
    if (!token?.trim()) return false;
    const JWT_SECRET_KEY = await this.settingSrv.get(SettingKey.JWT_SECRET_KEY);
    try {
      verify(token, JWT_SECRET_KEY, { algorithms: ['HS256'] });
      return true;
    } catch {
      return false;
    }
  }
}
