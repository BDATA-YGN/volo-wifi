import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { NetworkRadiusVendorProfilesController } from './controller';

export class NetworkRadiusVendorProfilesRoute implements Route {
  public path = '/wifi/network/radius/vendor-profiles';
  public router = Router();
  private controller = new NetworkRadiusVendorProfilesController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
