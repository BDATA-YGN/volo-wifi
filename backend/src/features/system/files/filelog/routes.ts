import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class FileLogRoute implements Route {
  public path = '/filelogs';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/stats`, AuthMiddleware, this.controller.getStorageStats);
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.fileLogListOrDetails);
    this.router.post(`${this.path}/sync`, AuthMiddleware, this.controller.fileLogSync);
    this.router.post(`${this.path}/sync-all`, AuthMiddleware, this.controller.fileLogSyncAll);
    this.router.post(`${this.path}/create-folder`, AuthMiddleware, this.controller.fileLogCreateFolder);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.fileLogCreateOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.fileLogDelete);
    this.router.get(`${this.path}/preview/:id`, AuthMiddleware, this.controller.fileLogPreview);
    this.router.get(`${this.path}-ct`, AuthMiddleware, this.controller.fetchFileLogCategoryAndTypes);
  }
}
