import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CommerceTransactionsOrdersController } from './controller';

export class CommerceTransactionsOrdersRoute implements Route {
  public path = '/wifi/commerce/transactions/orders';
  public router = Router();
  private controller = new CommerceTransactionsOrdersController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
