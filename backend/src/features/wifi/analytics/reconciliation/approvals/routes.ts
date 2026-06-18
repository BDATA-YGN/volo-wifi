import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { AnalyticsReconciliationApprovalsController } from './controller';

export class AnalyticsReconciliationApprovalsRoute implements Route {
  public path = '/wifi/analytics/reconciliation/approvals';
  public router = Router();
  private controller = new AnalyticsReconciliationApprovalsController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
