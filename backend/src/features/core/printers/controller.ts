import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { PrinterSchema } from './schema';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Printers } from '@/generated/prisma/client';
import md5 from 'md5';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

export class Controller {
  private printerService = Container.get<BaseService<Printers, any>>('printerService');

  // manage roles
  public printerListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const printers = await this.printerService.findWithCustomKey('id', req.params?.id);
        responseSuccess(res, { message: 'Success', data: printers });
      } else {
        const printers = await this.printerService.findAll(paginationParams, ['printerName'],{});
        responseSuccess(res, { message: 'Success', data: printers?.data, meta: printers?.meta });
      }
    }),
  ];

  public printerCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;

      const inputData = {
        ...req.body,

      }

        if (recordId && recordId !== 'all') {
        await this.printerService.update(recordId, inputData);
      }

      if (!recordId) {
        const { error, value } = PrinterSchema.validate(req.body, {
          abortEarly: false, // Show all errors
          allowUnknown: false, // Reject unknown fields
        });

        if (error) {
          return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
        }

        await this.printerService.create(inputData, '');
      }

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public printerDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      await this.printerService.delete(req.params.id);
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];
}
