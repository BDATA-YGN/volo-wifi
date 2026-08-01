import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { AdminSchema } from './schema';
import { ERROR, ERROR_CODE } from '@/utils/constant';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Admin } from '@/generated/prisma/client';
import { hashPassword } from '@/utils/password';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

export class Controller {
  private adminService = Container.get<BaseService<Admin, any>>('adminService');

  // manage roles
  public adminListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const admins = await this.adminService.findWithCustomKey('id', paginationParams?.id);
        responseSuccess(res, { message: 'Success', data: admins });
      } else {
        const { roleId, isActive, ...listParams } = paginationParams as Record<string, unknown>;

        const where: Record<string, unknown> = { isSuper: false };
        if (!isUndefinedOrUndefinedString(roleId)) {
          const parsedRoleId = Number(roleId);
          if (Number.isFinite(parsedRoleId)) where.roleId = parsedRoleId;
        }
        if (!isUndefinedOrUndefinedString(isActive)) {
          if (isActive === true || isActive === 'true') where.isActive = true;
          else if (isActive === false || isActive === 'false') where.isActive = false;
        }

        const admins = await this.adminService.findAll(
          listParams as any,
          ['username', 'fullName', 'email', 'phoneNumber'],
          {},
          where,
        );
        responseSuccess(res, { message: 'Success', data: admins?.data, meta: admins?.meta });
      }
    }),
  ];

  public adminCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;

      const inputData = {
        ...req.body,
        lastLogin: new Date(),
      }

      if (req.body.password) {
        inputData.password = await hashPassword(req.body.password);
      }

      if (recordId && recordId !== 'all') {
        await this.adminService.update(recordId, inputData);
      }

      if (!recordId) {
        const { error, value } = AdminSchema.validate(req.body, {
          abortEarly: false, // Show all errors
          allowUnknown: false, // Reject unknown fields
        });

        if (error) {
          return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
        }

        await this.adminService.create(inputData, 'username');
      }

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public adminDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      await this.adminService.delete(req.params.id);
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];
}

