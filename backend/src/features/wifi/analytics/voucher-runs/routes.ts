import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { AnalyticsVoucherRunsController } from './controller';

export class AnalyticsVoucherRunsRoute implements Route {
  public path = '/wifi/analytics/voucher-runs';
  public router = Router();
  private controller = new AnalyticsVoucherRunsController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
