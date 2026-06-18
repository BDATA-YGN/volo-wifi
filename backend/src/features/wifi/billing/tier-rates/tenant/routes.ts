import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { BillingTierRatesTenantController } from './controller';

export class BillingTierRatesTenantRoute implements Route {
  public path = '/wifi/billing/tier-rates/tenant';
  public router = Router();
  private controller = new BillingTierRatesTenantController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
