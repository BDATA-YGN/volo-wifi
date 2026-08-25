import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CommerceAccessTokensController } from './controller';

export class CommerceAccessTokensRoute implements Route {
  public path = '/wifi/commerce/access-tokens';
  public router = Router();
  private controller = new CommerceAccessTokensController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id/action`, AuthMiddleware, this.controller.applyAction);
    this.router.delete(
      `${this.path}/:id/sessions/:sessionId`,
      AuthMiddleware,
      this.controller.deleteSession,
    );
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
