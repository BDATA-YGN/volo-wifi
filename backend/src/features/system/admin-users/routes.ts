import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class AdminRoute implements Route {
  public path = '/admins';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * @api {get} /admins/:id? Admins List/Details
     * @apiGroup ADMINS
     * @apiVersion 1.0.0
     * @apiDescription Fetch a list of admins or details of a specific admin.
     *
     * @apiParam {String} [id] admin ID (optional for details).
     * 
     * @apiParam {Number} [limit=10] Number of items per page (default: 10).
     * @apiParam {Number} [page=1] Page number (default: 1).
     * @apiParam {String} [order_by="asc"] Order direction, either "asc" or "desc" (default: "asc").
     * @apiParam {Number} [skip=0] Number of items to skip (default: 0).
     * @apiParam {String} [search=""] Search query (default: empty string).
     * @apiParam {String} [sort_by="id"] Field to sort by (default: "id").
     * 
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound admin not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.get(`${this.path}/:id?`, AuthMiddleware, this.controller.adminListOrDetails);

    /**
     * @api {post} /admins/:id? admins Create/Update
     * @apiGroup ADMINS
     * @apiVersion 1.0.0
     * @apiDescription Create a new admin or update an existing admin.
     *
     * @apiParam {String} [id] ID (optional for update).
     * @apiBody {String} fullName FullName.
     * @apiBody {String} username Username.
     * @apiBody {String} email Email.
     * @apiBody {String} password Password.
     * @apiBody {Number} roleId=1 RoleId.
     * @apiBody {String} createdBy="system" CreatedBy.
     * @apiBody {String} [updatedBy] UpdatedBy.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.post(`${this.path}/:id?`, AuthMiddleware, this.controller.adminCreateOrUpdate);

    /**
     * @api {delete} /admins/delete/:id admins Delete
     * @apiGroup ADMINS
     * @apiVersion 1.0.0
     * @apiDescription Delete a specific admin.
     *
     * @apiParam {String} id admin ID.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound admin not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.delete(`${this.path}/delete/:id`, AuthMiddleware, this.controller.adminDelete);
  }
}

