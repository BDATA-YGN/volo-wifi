import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { PlacesController } from './controller';

export class PlacesRoute implements Route {
  public path = '/places';
  public router = Router();
  private controller = new PlacesController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/towns`, AuthMiddleware, ...this.controller.towns);
  }
}
