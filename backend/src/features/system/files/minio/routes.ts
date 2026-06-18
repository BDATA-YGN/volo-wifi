import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class MinioRoute implements Route {
  public path = '/storage/minio';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/folders`, AuthMiddleware, this.controller.listFolders);
    this.router.post(`${this.path}/folders`, AuthMiddleware, this.controller.createFolder);
    this.router.delete(`${this.path}/folders`, AuthMiddleware, this.controller.deleteFolder);
    this.router.get(`${this.path}/files`, AuthMiddleware, this.controller.listFiles);
    this.router.delete(`${this.path}/files`, AuthMiddleware, this.controller.deleteFile);
    this.router.get(`${this.path}/url`, AuthMiddleware, this.controller.getFileUrl);
  }
}
