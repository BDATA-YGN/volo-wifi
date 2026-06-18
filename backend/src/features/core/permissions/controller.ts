import { ValidationMiddleware } from "@/middlewares/validation.middleware";
import { responseError, responseSuccess } from "@/utils/api-response";
import { asyncController } from "@/utils/async-controller";
import { Request, Response } from "express";
import { Container } from "typedi";
import {
    MapRoleSettingsSchema,
    MngRoleSettingsManualCreateSchema,
    MngRoleSettingsManualUpdateSchema,
    MngRolesSchema,
} from "./schema";
import { ERROR, ERROR_CODE } from "@/utils/constant";
import { BaseService } from "@/third-party/bdataMysql/BaseService";
import {
    Admin,
    MapRoleSettings,
    MenuGroup,
    MenuItem,
    MngRoles,
    MngRoleSettings,
    MngRoleSettingKind,
} from "@/generated/prisma/client";
import { WebSocketService } from "@/third-party/bdataSocket";
import { AuthenticatedRequest } from "@/interfaces/express.interface";
import { SIO_EVENTS } from "@/third-party/bdataSocket/sioConstants";
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { DEFAULT_PAGINATION_LIMIT } from '@/config';
import { sortMngRoleSettingsByMenuPosition } from "./sortMngRoleSettingsByMenuPosition";

/** `level` lives on MngRoleSettings, not MapRoleSettings — filter via relation. */
function mapRoleSettingsLevelWhere(isSuper: boolean): Record<string, unknown> {
    if (isSuper) {
        return {};
    }
    return { mngRoleSettings: { level: "app", deletedAt: null } };
}

export class Controller {
    private mapRoleSettingsService = Container.get<BaseService<MapRoleSettings, any>>('mapRoleSettingsService');
    private mngRoleSettingsService = Container.get<BaseService<MngRoleSettings, any>>('mngRoleSettingsService');
    private mngRolesService = Container.get<BaseService<MngRoles, any>>('mngRolesService');
    private menuGroupService = Container.get<BaseService<MenuGroup, any>>('menuGroupService');
    private menuItemService = Container.get<BaseService<MenuItem, any>>('menuItemService');
    private socketService = WebSocketService.getInstance();

    // map role settings
    public mapRoleSettingsListOrDetails = [
        asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
            const paginationParams = req.query;
            const user = req.user as Admin;

            if (!isUndefinedOrUndefinedString(req.params?.id)) {
                const mapRoleSetting = await this.mapRoleSettingsService.findWithCustomKey('id', paginationParams?.id);
                return responseSuccess(res, { message: 'Success', data: mapRoleSetting });
            }

            if (paginationParams?.search) {
                const searchValue = Number(paginationParams.search);
                const mapRoleSetting = await this.mapRoleSettingsService.findAll({ ...paginationParams, search: searchValue }, ["roleId"], {}, mapRoleSettingsLevelWhere(user.isSuper === true));
                return responseSuccess(res, { message: 'Success', data: mapRoleSetting?.data, meta: mapRoleSetting?.meta });
            }

            if (!paginationParams?.id) {
                const mapRoleSettings = await this.mapRoleSettingsService.findAll(paginationParams, ["roleId"], {}, mapRoleSettingsLevelWhere(user.isSuper === true));
                return responseSuccess(res, { message: 'Success', data: mapRoleSettings?.data, meta: mapRoleSettings?.meta });
            }

        }),
    ];

    public mapRoleSettingsCreateOrUpdate = [
        asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
            const recordId = req.params?.id as string ?? null;
            const userId = req.user?.id as string;

            if (recordId === "all") {
                await this.mapRoleSettingsService.upsertMany(req.body);
            }

            if (recordId && recordId !== "all") {
                await this.mapRoleSettingsService.update(recordId, req.body);
            }

            if (!recordId) {
                const { error, value } = MapRoleSettingsSchema.validate(req.body, {
                    abortEarly: false, // Show all errors
                    allowUnknown: false, // Reject unknown fields
                });

                if (error) {
                    return responseError(res, 400, { code: "400", message: error.details.map((err) => err.message).join(', ') });
                }

                await this.mapRoleSettingsService.create(req.body);
            }

            this.socketService.sendSocketEvent({
                event: SIO_EVENTS.REGISTER_CONSOLE_ADMIN,
                eventId: userId,
                type: 'notification',
                data: { message: 'User updated map role settings' },
                timestamp: new Date()
              });

            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ];

    public mapRoleSettingsDelete = [
        asyncController(async (req: Request, res: Response): Promise<void> => {
            await this.mapRoleSettingsService.baseModel().delete({
                where: {
                    id: req.params.id as string
                }
            });
            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ];

    // manage role settings
    public mngRoleSettingsListOrDetails = [
        asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
            const user = req.user as Admin;
            const paginationParams = req.query;
            if (paginationParams?.settingKey) {
                const mngRoleSetting = await this.mngRoleSettingsService.findWithCustomKey('settingKey', paginationParams?.settingKey);
                responseSuccess(res, { message: 'Success', data: mngRoleSetting });
            } else {
                const excludeKindsRaw = paginationParams?.excludeKinds as string | undefined;
                const kindExact = paginationParams?.kind as string | undefined;
                let kindWhere: Record<string, unknown> = {};
                if (excludeKindsRaw && typeof excludeKindsRaw === 'string') {
                    const parts = excludeKindsRaw.split(',').map((s) => s.trim()).filter(Boolean) as MngRoleSettingKind[];
                    if (parts.length) {
                        kindWhere = { kind: { notIn: parts } };
                    }
                } else if (kindExact && typeof kindExact === 'string') {
                    kindWhere = { kind: kindExact as MngRoleSettingKind };
                }
                // Never expose super-scoped rows in the permission management UI.
                const levelWhere = user.isSuper == true ? { level: { not: "super" } } : { level: "app" };
                const prismaWhere = { ...levelWhere, ...kindWhere, deletedAt: null };

                if (paginationParams?.sort_by) {
                    const mngRoleSettings = await this.mngRoleSettingsService.findAll(
                        paginationParams,
                        ["settingKey"],
                        {},
                        { ...levelWhere, ...kindWhere },
                        undefined,
                    );
                    responseSuccess(res, { message: 'Success', data: mngRoleSettings?.data, meta: mngRoleSettings?.meta });
                    return;
                }

                let rows = await this.mngRoleSettingsService.baseModel().findMany({
                    where: prismaWhere,
                });

                const searchRaw = paginationParams?.search;
                if (searchRaw !== undefined && searchRaw !== null && String(searchRaw).trim() !== '') {
                    const needle = String(searchRaw).toLowerCase();
                    rows = rows.filter((r) => r.settingKey.toLowerCase().includes(needle));
                }

                const menuLevelFilter = user.isSuper == true ? {} : { level: 'app' as const };
                const [groups, menuItems] = await Promise.all([
                    this.menuGroupService.baseModel().findMany({
                        where: { deletedAt: null, ...menuLevelFilter },
                        select: { id: true, key: true, position: true },
                    }),
                    this.menuItemService.baseModel().findMany({
                        where: { deletedAt: null, ...menuLevelFilter },
                        select: { id: true, key: true, url: true, groupId: true, position: true },
                    }),
                ]);

                const sorted = sortMngRoleSettingsByMenuPosition(rows, groups, menuItems);

                const page = Number(paginationParams?.page) || 1;
                const limit =
                    Number(paginationParams?.limit) ||
                    Number(paginationParams?.take) ||
                    Number(DEFAULT_PAGINATION_LIMIT);
                const totalRows = sorted.length;
                const start = (page - 1) * limit;
                const pageRows = sorted.slice(start, start + limit);

                responseSuccess(res, {
                    message: 'Success',
                    data: pageRows,
                    meta: {
                        currentPage: page,
                        totalPages: Math.max(1, Math.ceil(totalRows / limit)),
                        totalRows,
                    },
                });
            }
        }),
    ];

    public mngRoleSettingsCreateOrUpdate = [
        asyncController(async (req: Request, res: Response): Promise<void> => {
            const recordId = req.params?.id as string ?? null;

            if (recordId) {
                const { error, value } = MngRoleSettingsManualUpdateSchema.validate(req.body, {
                    abortEarly: false,
                    allowUnknown: false,
                });
                if (error) {
                    return responseError(res, 400, { code: "400", message: error.details.map((e) => e.message).join(", ") });
                }

                const existing = await this.mngRoleSettingsService.findWithCustomKey("id", recordId);
                if (!existing) {
                    return responseError(res, 404, { code: "404", message: "Mng role setting not found" });
                }

                const isMenuDerived =
                    existing.kind === MngRoleSettingKind.menuGroup || existing.kind === MngRoleSettingKind.menu;
                const payload: Record<string, unknown> = { ...value };
                if (isMenuDerived) {
                    delete payload.kind;
                    delete payload.settingKey;
                }
                await this.mngRoleSettingsService.update(recordId, payload);
            } else {
                const { error, value } = MngRoleSettingsManualCreateSchema.validate(req.body, {
                    abortEarly: false,
                    allowUnknown: false,
                });
                if (error) {
                    return responseError(res, 400, { code: "400", message: error.details.map((e) => e.message).join(", ") });
                }

                const settingKey = value.settingKey as string;
                const checkRecordExists = await this.mngRoleSettingsService.findWithCustomKey("settingKey", settingKey);
                if (checkRecordExists) {
                    return responseError(res, 409, {
                        code: ERROR_CODE.COMFLIT,
                        message: ERROR.MESSAGE.CONFLICT(settingKey.toString()),
                    });
                }
                await this.mngRoleSettingsService.create(value);
            }
            responseSuccess(res, { message: "Success", data: {} });
        }),
    ];

    public mngRoleSettingsDelete = [
        asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
            const checkRecordExists = await this.mngRoleSettingsService.findWithCustomKey('id', req.params.id as string);
            if (checkRecordExists) {
                await this.mapRoleSettingsService.baseModel().deleteMany({
                    where: {
                        settingKey: checkRecordExists.id
                    }
                });
            }
            await this.mngRoleSettingsService.baseModel().delete({
                where: {
                    id: req.params.id as string
                }
            });
            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ];

    // manage roles
    public mngRolesListOrDetails = [
        asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
            const paginationParams = req.query;
            const user = req.user as Admin;

            if (paginationParams?.roleId) {
                const mngRole = await this.mngRolesService.findWithCustomKey('roleId', paginationParams?.roleId);
                responseSuccess(res, { message: 'Success', data: mngRole });
            } else {
                const mngRoles = await this.mngRolesService.findAll(paginationParams, ["roleId"], {}, user.isSuper == true ? { roleId: { not : 3 } } : { level: "app", roleId: { not : 3 } });
                responseSuccess(res, { message: 'Success', data: mngRoles?.data, meta: mngRoles?.meta });
            }
        }),
    ];

    public mngRolesCreateOrUpdate = [
        ValidationMiddleware(MngRolesSchema),
        asyncController(async (req: Request, res: Response): Promise<void> => {
            const recordId = Number(req.params.id);
            if(recordId == null) {
              return responseError(res, 400, {code: "400", message: "Invalid Payload"});
            }
            const roleId = Number(req.body.roleId);

            if (!recordId) {
                const checkRecordExists = await this.mngRolesService.findWithCustomKey('roleId', roleId);
                if (checkRecordExists) return responseError(res, 409, { code: ERROR_CODE.COMFLIT, message: ERROR.MESSAGE.CONFLICT(roleId.toString()) });
                await this.mngRolesService.create(req.body);
            } else {
                await this.mngRolesService.update(recordId, req.body);
            }

            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ];

    public mngRolesDelete = [
        asyncController(async (req: Request, res: Response): Promise<void> => {
            const checkRecordExists = await this.mngRolesService.findWithCustomKey('id', Number(req.params.id));
            if(checkRecordExists) {
                await this.mapRoleSettingsService.baseModel().deleteMany({
                    where: {
                        roleId: Number(checkRecordExists.roleId)
                    }
                });
            }
            await this.mngRolesService.baseModel().delete({
                where: {
                    id: Number(req.params.id)
                }
            });
            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ];

    public testSocketNoti = [
        asyncController(async (req: Request, res: Response): Promise<void> => {
            // this.socketService.sendSocketEvent({
            //     type: 'notification',
            //     status: 'success',
            //     data: { message: 'Updated notification!' },
            //     timestamp: new Date()
            //   });

            responseSuccess(res, { message: 'Success', data: {} });
        }),
    ]
}
