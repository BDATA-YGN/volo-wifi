import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CommercePartnersController } from './controller';

export class CommercePartnersRoute implements Route {
  public path = '/wifi/commerce/partners';
  public router = Router();
  private controller = new CommercePartnersController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(
      `${this.path}/reset-password/:id`,
      AuthMiddleware,
      this.controller.resetPassword
    );
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
