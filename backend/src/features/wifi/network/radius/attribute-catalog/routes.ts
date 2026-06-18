import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NetworkRadiusAttributeCatalogController } from './controller';

export class NetworkRadiusAttributeCatalogRoute implements Route {
  public path = '/wifi/network/radius/attribute-catalog';
  public router = Router();
  private controller = new NetworkRadiusAttributeCatalogController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
