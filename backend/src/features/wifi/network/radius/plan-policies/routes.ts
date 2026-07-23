import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NetworkRadiusPlanPoliciesController } from './controller';

export class NetworkRadiusPlanPoliciesRoute implements Route {
  public path = '/wifi/network/radius/plan-policies';
  public router = Router();
  private controller = new NetworkRadiusPlanPoliciesController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/group`, AuthMiddleware, this.controller.removeGroup);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
