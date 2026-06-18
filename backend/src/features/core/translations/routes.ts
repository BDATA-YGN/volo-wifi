import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class TranslationRoute implements Route {
  public path = '/translations';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:locale`, this.controller.getTranslationsByLocale);
    this.router.post(`${this.path}/:locale`, this.controller.updateTranslationByLocale);
    this.router.get(`${this.path}`, this.controller.getLocalLanguages);
  }
}
