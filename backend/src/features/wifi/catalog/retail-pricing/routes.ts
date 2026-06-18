import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CatalogRetailPricingController } from './controller';

export class CatalogRetailPricingRoute implements Route {
  public path = '/wifi/catalog/retail-pricing';
  public router = Router();
  private controller = new CatalogRetailPricingController();

  constructor() {
    this.router.post(`${this.path}/prices/:priceId?`, AuthMiddleware, this.controller.upsertPrice);
    this.router.delete(
      `${this.path}/prices/delete/:priceId`,
      AuthMiddleware,
      this.controller.removePrice
    );
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
