import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { BillingSubscriptionChangelogController } from './controller';

export class BillingSubscriptionChangelogRoute implements Route {
  public path = '/wifi/billing/subscription/changelog';
  public router = Router();
  private controller = new BillingSubscriptionChangelogController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
