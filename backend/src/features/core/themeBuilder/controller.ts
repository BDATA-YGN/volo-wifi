import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { AdminSchema } from './schema';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Theme } from '@/generated/prisma/client';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

export class Controller {
  private themeService = Container.get<BaseService<Theme, any>>('themeService');

  // manage roles
  public themeListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const themes = await this.themeService.findWithCustomKey('id', paginationParams?.id);
        responseSuccess(res, { message: 'Success', data: themes });
      } else {
        const themes = await this.themeService.findAll(paginationParams, ['name'], {}, {});
        responseSuccess(res, { message: 'Success', data: themes?.data, meta: themes?.meta });
      }
    }),
  ];

  public themeCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;

      const inputData = {
        ...req.body,
      }

      if (req.body.isActive === true) {
        await this.themeService.baseModel().updateMany({
          where: {
            isActive: true
          },
          data: {
            isActive: false
          }
         });
      }

      if (req.body.isDefault === true) {
        await this.themeService.baseModel().updateMany({
          where: {
            isDefault: true
          },
          data: {
            isDefault: false
          }
         });
      }

      if (recordId) {
        await this.themeService.update(recordId, inputData);
      }

      if (!recordId) {
        await this.themeService.create(inputData, 'name');
      }

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public themeDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      await this.themeService.delete(req.params.id);
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];
}
