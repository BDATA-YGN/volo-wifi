import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class MenuRoute implements Route {
  public path = '/menus-groups';
  public menuPath = '/menu-items'
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}?`, AuthMiddleware, this.controller.getAllMenuGroups);
    this.router.get(`${this.path}/:id`, AuthMiddleware, this.controller.getSingleMenuGroup);
    this.router.post(`${this.path}`, AuthMiddleware, this.controller.createMenuGroup);
    this.router.put(`${this.path}/:id?`, AuthMiddleware, this.controller.updateMenuGroup);
    this.router.delete(`${this.path}/:id`, AuthMiddleware, this.controller.deleteMenuGroup);
    this.router.post(`${this.path}/positions`, AuthMiddleware, this.controller.updateMenuGroupPositions);
    this.router.get(`${this.path}/:groupId/menu-items`, AuthMiddleware, this.controller.getAllMenusItemsForGroup);
    this.router.get(`${this.menuPath}/:id`, AuthMiddleware, this.controller.getSingleMenuItem);
    this.router.post(`${this.menuPath}/:groupId/menu-items`, AuthMiddleware, this.controller.createMenuItem);
    this.router.put(`${this.menuPath}/:id`, AuthMiddleware, this.controller.updateMenuItem);
    this.router.delete(`${this.menuPath}/:id`, AuthMiddleware, this.controller.deleteMenuItem);
    this.router.put(`${this.path}/:groupId/menu-items/positions`, AuthMiddleware, this.controller.updateMenuItemPosition);
  }
}
