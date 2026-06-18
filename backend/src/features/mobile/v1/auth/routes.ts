import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { SMS_MOBILE_API_PREFIX } from '@/features/mobile/shared/constants';
import { MobileAuthController } from './controller';
import { MobileAuthLoginRateLimit, MobileAuthRefreshRateLimit } from './auth.rate-limit.middleware';

export class MobileAuthRoute implements Route {
  public path = `${SMS_MOBILE_API_PREFIX}/auth`;
  public router = Router();
  private controller = new MobileAuthController();

  constructor() {
    this.router.post(`${this.path}/login`, MobileAuthLoginRateLimit, ...this.controller.login);
    this.router.get(`${this.path}/me`, ...this.controller.me);
    this.router.post(`${this.path}/logout`, ...this.controller.logout);
    this.router.post(
      `${this.path}/token/refresh`,
      MobileAuthRefreshRateLimit,
      ...this.controller.refreshToken,
    );
    this.router.post(`${this.path}/change-password`, ...this.controller.changePassword);
  }
}
