import { Router } from 'express';
import { Controller as AuthController } from './controller';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class AuthRoute implements Route {
  public path = '/auth';
  public router = Router();
  public authController = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * @api {post} /auth/login Login
     * @apiGroup AUTH
     * @apiVersion 1.0.0
     * @apiDescription This endpoint allows a user to log in to the application.
     * @apiBody {String} username="admin@gmail.com" The username of the user.
     * @apiBody {String} password="asdfasdf" The password of the user.
     * @apiSuccess {String} token The JWT token for the authenticated user.
     * @apiError (404) User not found.
     * @apiError (401) Unauthorized Invalid credentials provided.
     */
    this.router.post(`${this.path}/login`, this.authController.login);

    /**
     * @api {post} /auth/logout Logout
     * @apiGroup AUTH
     * @apiVersion 1.0.0
     * @apiDescription This endpoint allows a user to log out of the application.
     * @apiSuccess {String} message Logout successful.
     * @apiError (401) Unauthorized Invalid or missing token.
     */
    this.router.post(`${this.path}/logout`, this.authController.logout);

    /**
     * @api {get} /auth/me Admin Details
     * @apiGroup AUTH
     * @apiVersion 1.0.0
     * @apiDescription Operations about user authentication
     * @apiSuccess {String} message Logout successful.
     * @apiError (401) Unauthorized Invalid or missing token.
     */
    this.router.get(`${this.path}/me`, AuthMiddleware, this.authController.me);

    /**
     * @api {post} /auth/change-password Change password
     * @apiGroup AUTH
     * @apiVersion 1.0.0
     * @apiDescription Requires current password; invalidates other sessions.
     */
    this.router.post(
      `${this.path}/change-password`,
      AuthMiddleware,
      this.authController.changePassword,
    );

    /**
     * @api {get} /auth/token/refresh Refresh Token
     * @apiName Refresh Token
     * @apiGroup API
     * @apiVersion 1.0.0
     *
     * @apiSuccess {String} message Response message.
     * @apiSuccess {Object} data
     * @apiSuccess {String} data.token New authentication token.
     */
    this.router.get(`${this.path}/token/refresh`, this.authController.refreshToken);
  }
}

