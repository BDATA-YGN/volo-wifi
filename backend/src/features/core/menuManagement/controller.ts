import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { MenuGroupSchema, MenuItemSchema, MenuItemPositionSchema } from './schema';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { MenuGroup, MenuItem, MapRoleSettings, MngRoles, MngRoleSettings, MngRoleSettingKind, Admin } from '@/generated/prisma/client';
import { AuthenticatedRequest } from "@/interfaces/express.interface";
import PrismaDBConnection from '@/prisma/prisma-client';
import { ERROR, ERROR_CODE } from '@/utils/constant';
import { logger } from '@/logging/logger';
const prisma = PrismaDBConnection.getConnection();

export class Controller {
  private menuGroupService = Container.get<BaseService<MenuGroup, any>>('menuGroupService');
  private menuItemService = Container.get<BaseService<MenuItem, any>>('menuItemService');
  private mapRoleSettingsService = Container.get<BaseService<MapRoleSettings, any>>('mapRoleSettingsService');
  private mngRoleSettingsService = Container.get<BaseService<MngRoleSettings, any>>('mngRoleSettingsService');
  private mngRolesService = Container.get<BaseService<MngRoles, any>>('mngRolesService');

  // Get all menu groups
  public getAllMenuGroups = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;
      const whereObject = user.isSuper == true ? {} : { level: "app" };
      const groups = await this.menuGroupService.baseModel().findMany({
        where: { deletedAt: null , ...whereObject },
        include: { items: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
        orderBy: { position: 'asc' },
      });
      responseSuccess(res, { message: 'Success', data: groups });
    }),
  ];

  // Get a single menu group
  public getSingleMenuGroup = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const idParam = req.params.id as unknown as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const group = await this.menuGroupService.findWithCustomKey('id', parseInt(id));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }
      responseSuccess(res, { message: 'Success', data: group });
    }),
  ];

  // Create a menu group
  public createMenuGroup = [
    ValidationMiddleware(MenuGroupSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { key, title, icon } = req.body;
      const maxPosition = await this.menuGroupService.baseModel().findFirst({
        where: { deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const newGroup = await this.menuGroupService.create(
        {
          key,
          title,
          icon,
          position: (maxPosition?.position ?? 0) + 1,
        },
        'key'
      );
      await this.mngRoleSettingsService.create({
        settingKey: key,
        description: `${title}`,
        parentId: `${newGroup.id.toString()}`,
        kind: MngRoleSettingKind.menuGroup,
        }, 'settingKey');
      responseSuccess(res, { message: 'Menu group created successfully', data: newGroup });
    }),
  ];

  // Update a menu group
  public updateMenuGroup = [
    ValidationMiddleware(MenuGroupSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const idParam = req.params.id as unknown as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const { key, title, icon, mode } = req.body;
      const group = await this.menuGroupService.findWithCustomKey('id', Number(id));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }

      if(mode != null){
        logger.debug('Updating menu group mode', { mode });
        await this.menuGroupService.baseModel().updateMany({
          where: {
            mode: 1
          },
          data: {
            mode: 0
          }
         });
         await this.menuGroupService.update(Number(id), { mode });
        return responseSuccess(res, { message: 'Menu group updated successfully', data: {} });
      } else {
        const updatedGroup = await this.menuGroupService.update(Number(id), { key, title, icon });
        const checkRecordExists = await this.mngRoleSettingsService.findWithCustomKey('settingKey', key);
        if (checkRecordExists){
          await this.mngRoleSettingsService.update(checkRecordExists.id, {
            settingKey: key,
            description: `${title}`,
            parentId: `${updatedGroup.id.toString()}`,
            kind: MngRoleSettingKind.menuGroup,
            });
        }
        return responseSuccess(res, { message: 'Menu group updated successfully', data: updatedGroup });
      }

    }),
  ];

  // Delete a menu group (soft delete)
  public deleteMenuGroup = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const idParam = req.params.id as unknown as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const group = await this.menuGroupService.findWithCustomKey('id', Number(id));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }
      await this.menuGroupService.baseModel().delete({
        where: { id: parseInt(id) }
      });
      const checkRecordExists = await this.mngRoleSettingsService.baseModel().findFirst({
        where: {
          deletedAt: null,
          ['OR']: [
            { settingKey: group.key },
            { parentId: id.toString() }
          ]
        }
      });
      if(checkRecordExists){
        logger.debug('Menu role setting found for delete cascade', { id: checkRecordExists.id });
        await this.mapRoleSettingsService.baseModel().deleteMany({
          where: {
            settingKey: checkRecordExists.id
          }
        });
        await this.mngRoleSettingsService.baseModel().deleteMany({
          where: {
            id: checkRecordExists.id
          }
        });
      }
      responseSuccess(res, { message: 'Menu group deleted successfully', data: {} });
    }),
  ];

  // Update menu group positions
  public updateMenuGroupPositions = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const menuData = req.body;

      try {
        // Perform updates within a transaction
        await prisma.$transaction(async (prisma) => {
          // Update menu groups
          for (const group of menuData) {
            const existingGroup = await this.menuGroupService.findWithCustomKey('id', Number(group.id));
            if (!existingGroup || existingGroup.deletedAt) {
              throw new Error(`Menu group with id ${group.id} not found`);
            }

            await this.menuGroupService.baseModel().update({
              where: { id: parseInt(group.id) },
              data: {
                key: group.key,
                title: group.title,
                icon: group.icon,
                position: group.position,
                updatedAt: new Date(),
              },
            });

            // Update menu items
            for (const item of group.items) {
              const existingItem = await this.menuItemService.findWithCustomKey('id', Number(item.id));
              if (!existingItem || existingItem.deletedAt) {
                throw new Error(`Menu item with id ${item.id} not found`);
              }

              if (item.groupId !== group.id) {
                throw new Error(`Menu item ${item.id} groupId mismatch`);
              }

              await this.menuItemService.baseModel().update({
                where: { id: parseInt(item.id) },
                data: {
                  key: item.key,
                  title: item.title,
                  icon: item.icon,
                  url: item.url,
                  position: item.position,
                  groupId: item.groupId,
                  updatedAt: new Date(),
                },
              });
            }
          }
        });

        responseSuccess(res, {
          message: 'Menu structure updated successfully',
        });
      } catch (error) {
        responseError(res, 400, {
          code: '400',
          message: error.message || 'Failed to update menu structure',
        });
      }
    }),
  ];

  // Get all menu items for a group
  public getAllMenusItemsForGroup = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const groupIdParam = req.params.groupId as unknown as string | string[];
      const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
      const user = req.user as Admin;
      const whereObject = user.isSuper == true ? {} : { level: "app" };
      const group = await this.menuGroupService.findWithCustomKey('id', Number(groupId));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }
      const items = await this.menuItemService.baseModel().findMany({
        where: { groupId: parseInt(groupId), deletedAt: null, ...whereObject },
        orderBy: { position: 'asc' },
      });
      responseSuccess(res, { message: 'Success', data: items });
    }),
  ];

  // Get a single menu item
  public getSingleMenuItem = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const item = await this.menuItemService.findWithCustomKey('id', id);
      if (!item || item.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu item not found' });
      }
      responseSuccess(res, { message: 'Success', data: item });
    }),
  ];

  // Create a menu item
  public createMenuItem = [
    ValidationMiddleware(MenuItemSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const groupIdParam = req.params.groupId as unknown as string | string[];
      const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
      const { key, title, icon, url } = req.body;
      const checkRecordExists = await this.mngRoleSettingsService.findWithCustomKey('settingKey', key);
      if (checkRecordExists) return responseError(res, 409, { code: ERROR_CODE.COMFLIT, message: ERROR.MESSAGE.CONFLICT(key.toString()) });

      const group = await this.menuGroupService.findWithCustomKey('id', Number(groupId));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }
      const maxPosition = await this.menuItemService.baseModel().findFirst({
        where: { groupId: parseInt(groupId), deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const newItem = await this.menuItemService.create(
        {
          key,
          title,
          icon,
          url,
          groupId: parseInt(groupId),
          position: (maxPosition?.position ?? 0) + 1,
        },
        'key'
      );
      await this.mngRoleSettingsService.create({
        settingKey: key,
        description: `${title}`,
        parentId: `${newItem.id.toString()}`,
        kind: MngRoleSettingKind.menu,
        }, 'settingKey');
      responseSuccess(res, { message: 'Menu item created successfully', data: newItem });
    }),
  ];

  // Update a menu item
  public updateMenuItem = [
    ValidationMiddleware(MenuItemSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { key, title, icon, url, groupId } = req.body;

      const group = await this.menuGroupService.findWithCustomKey('id', Number(groupId));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }

      const item = await this.menuItemService.findWithCustomKey('id', Number(id));
      if (!item || item.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu item not found' });
      }
      const updatedItem = await this.menuItemService.update(Number(id), { key, title, icon, url, groupId, level: group.level });
      const checkRecordExists = await this.mngRoleSettingsService.baseModel().findFirst({
        where: {
          deletedAt: null,
          ['OR']: [
            { settingKey: key },
            { parentId: id.toString() }
          ]
        }
      });
      if (checkRecordExists){
        await this.mngRoleSettingsService.update(checkRecordExists.id, {
          settingKey: key,
          description: `${title}`,
          parentId: `${updatedItem.id.toString()}`,
          kind: MngRoleSettingKind.menu,
        });
      }
      responseSuccess(res, { message: 'Menu item updated successfully', data: updatedItem });
    }),
  ];

  // Delete a menu item (soft delete)
  public deleteMenuItem = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const idParam = req.params.id as unknown as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const item = await this.menuItemService.findWithCustomKey('id', Number(id));
      if (!item || item.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu item not found' });
      }
      await this.menuItemService.baseModel().delete({
        where: { id: parseInt(id) }
      });
      const checkRecordExists = await this.mngRoleSettingsService.findWithCustomKey('settingKey', item.key);
      logger.debug('Menu record exists check', { exists: Boolean(checkRecordExists) });
      if(checkRecordExists){
        await this.mngRoleSettingsService.baseModel().delete({
          where: { id: checkRecordExists.id }
        });
      }
      responseSuccess(res, { message: 'Menu item deleted successfully', data: {} });
    }),
  ];

  // Update menu item positions
  public updateMenuItemPosition = [
    ValidationMiddleware(MenuItemPositionSchema),
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const groupIdParam = req.params.groupId as unknown as string | string[];
      const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
      const items: { id: number; position: number }[] = req.body;
      const group = await this.menuGroupService.findWithCustomKey('id', Number(groupId));
      if (!group || group.deletedAt) {
        return responseError(res, 404, { code: '404', message: 'Menu group not found' });
      }
      await this.menuItemService.baseModel().$transaction(
        items.map(item =>
          this.menuItemService.baseModel().update({
            where: { id: item.id, groupId: parseInt(groupId), deletedAt: null },
            data: { position: item.position, updatedAt: new Date() },
          })
        )
      );
      const updatedItems = await this.menuItemService.baseModel().findMany({
        where: { groupId: parseInt(groupId), deletedAt: null },
        orderBy: { position: 'asc' },
      });
      responseSuccess(res, { message: 'Menu item positions updated successfully', data: updatedItems });
    }),
  ];
}
