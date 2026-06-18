import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NetworkRadiusAuthEventsController } from './controller';

export class NetworkRadiusAuthEventsRoute implements Route {
  public path = '/wifi/network/radius/auth-events';
  public router = Router();
  private controller = new NetworkRadiusAuthEventsController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
