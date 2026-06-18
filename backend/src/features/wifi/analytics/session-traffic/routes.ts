import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { AnalyticsSessionTrafficController } from './controller';

export class AnalyticsSessionTrafficRoute implements Route {
  public path = '/wifi/analytics/session-traffic';
  public router = Router();
  private controller = new AnalyticsSessionTrafficController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
