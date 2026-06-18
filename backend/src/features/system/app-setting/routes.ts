import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { AppSettingController } from './controller';

/**
 * `AppSetting` routes — HR / System domain.
 *
 *   GET    /app-settings/public/app-shell   public bootstrap (SSR / no auth)
 *   GET    /app-settings/key/:key
 *   GET    /app-settings/:id?
 *   POST   /app-settings/batch/app-shell    batch UI fields (auth)
 *   POST   /app-settings/:id?               create (no id) / update (with id) (auth)
 *   DELETE /app-settings/delete/:id         (auth)
 */
export class AppSettingRoute implements Route {
  public path = '/app-settings';
  public router = Router();
  private controller = new AppSettingController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Static paths must be registered before `/:id?` so `key` / `public` / `batch` are not captured as ids.
    this.router.get(`${this.path}/public/app-shell`, this.controller.publicAppShell);
    this.router.get(`${this.path}/key/:key`, this.controller.getByKey);
    this.router.get(`${this.path}/:id?`, this.controller.listOrDetails);

    this.router.post(`${this.path}/batch/app-shell`, AuthMiddleware, this.controller.updateAppShellBatch);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.remove);
  }
}
