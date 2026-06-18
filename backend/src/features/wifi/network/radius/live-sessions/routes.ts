import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NetworkRadiusLiveSessionsController } from './controller';

export class NetworkRadiusLiveSessionsRoute implements Route {
  public path = '/wifi/network/radius/live-sessions';
  public router = Router();
  private controller = new NetworkRadiusLiveSessionsController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
