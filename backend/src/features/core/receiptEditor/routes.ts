import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class ReceiptsRoute implements Route {
  public path = '/receipts';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.receiptListOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.receiptCreateOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.receiptDelete);
    this.router.post(`/testPrint`, AuthMiddleware, this.controller.testPrint);
  }
}
