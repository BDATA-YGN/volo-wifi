import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { AnalyticsReconciliationCoverageController } from './controller';

export class AnalyticsReconciliationCoverageRoute implements Route {
  public path = '/wifi/analytics/reconciliation/coverage';
  public router = Router();
  private controller = new AnalyticsReconciliationCoverageController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
