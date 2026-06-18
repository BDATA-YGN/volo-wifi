import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class AuditRoute implements Route {
  public path = '/audit';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/logs`, AuthMiddleware, this.controller.auditListOrDetails);
    this.router.get(`${this.path}/logs/:id`, AuthMiddleware, this.controller.auditListOrDetails);
    this.router.get(`${this.path}/overview`, AuthMiddleware, this.controller.auditLogOverview);
    this.router.get(`${this.path}/login-logs`, AuthMiddleware, this.controller.loginLogList);
    this.router.get(`${this.path}/login-logs/overview`, AuthMiddleware, this.controller.loginLogOverview);
    this.router.get(`${this.path}/retention`, AuthMiddleware, this.controller.retentionPreview);
    this.router.get(`${this.path}/export`, AuthMiddleware, this.controller.auditLogExport);
  }
}

