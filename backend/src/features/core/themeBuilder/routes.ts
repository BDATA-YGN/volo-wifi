import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class ThemeRoute implements Route {
  public path = '/themes';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id?`, this.controller.themeListOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.themeCreateOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.themeDelete);
  }
}
