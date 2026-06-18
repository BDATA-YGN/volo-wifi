import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { TenantRegistrationController } from './controller';

export class BillingTenantRegistrationRoute implements Route {
  public path = '/wifi/billing/tenant-registration';
  public router = Router();
  private controller = new TenantRegistrationController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/prerequisites`, AuthMiddleware, this.controller.prerequisites);
    this.router.post(`${this.path}/register`, AuthMiddleware, this.controller.register);
  }
}
