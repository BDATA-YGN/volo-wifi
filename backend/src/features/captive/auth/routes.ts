import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { CaptiveAuthController } from './controller';
import { CaptiveClientAuthMiddleware } from '@/features/captive/middleware/client-auth.middleware';
import {
  captiveLoginCredentialRateLimit,
  captiveLoginIpRateLimit,
} from '@/features/captive/middleware/captive-login-rate-limit.middleware';

export class CaptiveAuthRoute implements Route {
  public path = '';
  public router = Router();
  private controller = new CaptiveAuthController();

  constructor() {
    this.router.post('/login', captiveLoginIpRateLimit, captiveLoginCredentialRateLimit, ...this.controller.login);
    this.router.post('/logout', CaptiveClientAuthMiddleware, ...this.controller.logout);
    this.router.post('/session', CaptiveClientAuthMiddleware, ...this.controller.saveSession);
    this.router.get('/session', CaptiveClientAuthMiddleware, ...this.controller.getSession);
    this.router.get('/check/server', ...this.controller.checkServer);
  }
}
