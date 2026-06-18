import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class NotificationsRoute implements Route {
  public path = '/notifications-templates';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.templateListOrDetails);
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.templateCreateOrUpdate);
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.templateDelete);

    this.router.get(`/notifications-logs`, AuthMiddleware, this.controller.notificationLogs);
    this.router.get(`/notifications-recipients`, AuthMiddleware, this.controller.notificationRecipients);
    this.router.get(`/notifications-settings`, AuthMiddleware, this.controller.notificationSettings);

    this.router.post(`/send-notification`, AuthMiddleware, this.controller.sendNotification);
  }
}
