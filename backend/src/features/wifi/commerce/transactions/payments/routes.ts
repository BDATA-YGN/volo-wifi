import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { CommerceTransactionsPaymentsController } from './controller';

export class CommerceTransactionsPaymentsRoute implements Route {
  public path = '/wifi/commerce/transactions/payments';
  public router = Router();
  private controller = new CommerceTransactionsPaymentsController();

  constructor() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
