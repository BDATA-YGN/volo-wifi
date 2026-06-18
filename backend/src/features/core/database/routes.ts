import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class DatabaseRoute implements Route {
  public path = '/database';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/create/:name`, AuthMiddleware, this.controller.createBackup);
    this.router.post(`${this.path}/restore/:logId`, AuthMiddleware, this.controller.restoreDatabase);
    this.router.get(`${this.path}/logs`, AuthMiddleware, this.controller.getAllDatabasesLogs);
    this.router.get(`${this.path}/backup/download/:logId`, AuthMiddleware, this.controller.downloadBackup);
    this.router.post(`${this.path}/upload`, AuthMiddleware, this.controller.uploadBackup);
  }
}
