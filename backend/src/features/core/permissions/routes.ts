import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller as MenuPermissionController } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class MenuPermissionRoute implements Route {
  public path = '/menu-permission';
  public router = Router();
  public menuPermissionController = new MenuPermissionController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * @api {get} /menu-permission/map-role-settings MapRoleSettings List/Details
     * @apiGroup MAP_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Fetch a list of MapRoleSettings or details of a specific MapRoleSetting.
     *
     * @apiParam {String} [id] MapRoleSetting ID (optional for details).
     * 
     * @apiParam {Number} [limit=10] Number of items per page (default: 10).
     * @apiParam {Number} [page=1] Page number (default: 1).
     * @apiParam {String} [order_by="asc"] Order direction, either "asc" or "desc" (default: "asc").
     * @apiParam {Number} [skip=0] Number of items to skip (default: 0).
     * @apiParam {String} [search=""] Search query (default: empty string).
     * @apiParam {String} [sort_by="id"] Field to sort by (default: "id").
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MapRoleSetting not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.get(`${this.path}/map-role-settings/:id?`, AuthMiddleware, this.menuPermissionController.mapRoleSettingsListOrDetails);

    /**
     * @api {post} /menu-permission/map-role-settings MapRoleSettings Create/Update
     * @apiGroup MAP_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Create a new MapRoleSetting or update an existing MapRoleSetting.
     *
     * @apiParam {String} [id] MapRoleSetting ID (optional for update).
     * @apiBody {Number} roleId Role ID.
     * @apiBody {String} settingKey Setting key.
     * @apiBody {Boolean} enable=true Enable flag.
     * @apiBody {Boolean} visibility=true Visibility flag.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.post(`${this.path}/map-role-settings/:id?`, AuthMiddleware, this.menuPermissionController.mapRoleSettingsCreateOrUpdate);

    /**
     * @api {delete} /menu-permission/map-role-settings/delete MapRoleSettings Delete
     * @apiGroup MAP_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Delete a specific MapRoleSetting.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MapRoleSetting not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.delete(`${this.path}/map-role-settings/delete/:id`, AuthMiddleware, this.menuPermissionController.mapRoleSettingsDelete);

    /**
     * @api {get} /menu-permission/mng-role-settings MngRoleSettings List/Details
     * @apiGroup MNG_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Fetch a list of MngRoleSettings or details of a specific MngRoleSetting.
     *
     * @apiParam {Number} [limit=10] Number of items per page (default: 10).
     * @apiParam {Number} [page=1] Page number (default: 1).
     * @apiParam {String} [order_by="asc"] Order direction, either "asc" or "desc" (default: "asc").
     * @apiParam {Number} [skip=0] Number of items to skip (default: 0).
     * @apiParam {String} [search=""] Search query (default: empty string).
     * @apiParam {String} [sort_by] When set, sorts by this field via Prisma. When omitted, list order follows the menu tree: menu groups by `tbl_menu_group.position`, menu items under each group by `tbl_menu_item.position`, then button/feature rows by kind and `settingKey`.
     * @apiParam {String} [excludeKinds] Comma-separated kinds to omit (menuGroup, menu, button, feature).
     * @apiParam {String} [kind] Filter to one kind (menuGroup | menu | button | feature).
     * 
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MngRoleSetting not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.get(`${this.path}/mng-role-settings/:id?`, AuthMiddleware, this.menuPermissionController.mngRoleSettingsListOrDetails);

    /**
     * @api {post} /menu-permission/mng-role-settings MngRoleSettings Create/Update
     * @apiGroup MNG_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Create a new MngRoleSetting or update an existing MngRoleSetting.
     *
     * @apiParam {String} [id] MngRoleSetting ID (optional for update).
     * @apiBody {String} settingKey Setting key.
     * @apiBody {String} [description] Description.
     * @apiBody {String="button"|"feature"} kind Required on create (manual entries only). Optional on update for button/feature rows.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.post(`${this.path}/mng-role-settings/:id?`, AuthMiddleware, this.menuPermissionController.mngRoleSettingsCreateOrUpdate);

    /**
     * @api {delete} /menu-permission/mng-role-settings/delete MngRoleSettings Delete
     * @apiGroup MNG_ROLE_SETTINGS
     * @apiVersion 1.0.0
     * @apiDescription Delete a specific MngRoleSetting.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MngRoleSetting not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.delete(`${this.path}/mng-role-settings/delete/:id`, AuthMiddleware, this.menuPermissionController.mngRoleSettingsDelete);

    /**
     * @api {get} /menu-permission/mng-roles MngRoles List/Details
     * @apiGroup MNG_ROLES
     * @apiVersion 1.0.0
     * @apiDescription Fetch a list of MngRoles or details of a specific MngRole.
     *
     * @apiParam {Number} [id] MngRole ID (optional for details).
     * 
     * @apiParam {Number} [limit=10] Number of items per page (default: 10).
     * @apiParam {Number} [page=1] Page number (default: 1).
     * @apiParam {String} [order_by="asc"] Order direction, either "asc" or "desc" (default: "asc").
     * @apiParam {Number} [skip=0] Number of items to skip (default: 0).
     * @apiParam {String} [search=""] Search query (default: empty string).
     * @apiParam {String} [sort_by="id"] Field to sort by (default: "id").
     * 
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MngRole not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.get(`${this.path}/mng-roles/:id?`, AuthMiddleware, this.menuPermissionController.mngRolesListOrDetails);

    /**
     * @api {post} /menu-permission/mng-roles MngRoles Create/Update
     * @apiGroup MNG_ROLES
     * @apiVersion 1.0.0
     * @apiDescription Create a new MngRole or update an existing MngRole.
     *
     * @apiParam {Number} [id] MngRole ID (optional for update).
     * @apiBody {Number} roleId Role ID.
     * @apiBody {String} roleName Role name.
     * @apiBody {String} [description] Description.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.post(`${this.path}/mng-roles/:id?`, AuthMiddleware, this.menuPermissionController.mngRolesCreateOrUpdate);

    /**
     * @api {delete} /menu-permission/mng-roles/delete MngRoles Delete
     * @apiGroup MNG_ROLES
     * @apiVersion 1.0.0
     * @apiDescription Delete a specific MngRole.
     *
     * @apiError (400) BadRequest Invalid request parameters.
     * @apiError (404) NotFound MngRole not found.
     * @apiError (500) InternalServerError Unexpected server error.
     */
    this.router.delete(`${this.path}/mng-roles/delete/:id`, AuthMiddleware, this.menuPermissionController.mngRolesDelete);


    this.router.get(`${this.path}/test/noti`, this.menuPermissionController.testSocketNoti);
  }
}
