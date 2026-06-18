import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { CaptiveDashboardController } from './controller';
import { CaptiveClientAuthMiddleware } from '@/features/captive/middleware/client-auth.middleware';

export class CaptiveDashboardRoute implements Route {
  public path = '/dashboard';
  public router = Router();
  private controller = new CaptiveDashboardController();

  constructor() {
    this.router.get(this.path, CaptiveClientAuthMiddleware, ...this.controller.getDashboard);
    this.router.get(`${this.path}/usage`, CaptiveClientAuthMiddleware, ...this.controller.getUsage);
    this.router.get(`${this.path}/connection`, CaptiveClientAuthMiddleware, ...this.controller.getConnection);
    this.router.get(`${this.path}/plan`, CaptiveClientAuthMiddleware, ...this.controller.getPlan);
    this.router.get(`${this.path}/plans`, CaptiveClientAuthMiddleware, ...this.controller.getPlans);
  }
}
