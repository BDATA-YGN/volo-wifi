import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CommerceTokenDiagnoseController } from './controller';

export class CommerceTokenDiagnoseRoute implements Route {
  public path = '/wifi/commerce/token-diagnose';
  public router = Router();
  private controller = new CommerceTokenDiagnoseController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
