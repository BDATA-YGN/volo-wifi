import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { BillingTierRatesPlatformController } from './controller';

export class BillingTierRatesPlatformRoute implements Route {
  public path = '/wifi/billing/tier-rates/platform';
  public router = Router();
  private controller = new BillingTierRatesPlatformController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
