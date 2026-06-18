import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Printers, ReceiptTemplate } from '@/generated/prisma/client';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { generateReceiptHtml } from '@/third-party/bdataPrinter/v1';
import { print } from '@/third-party/bdataPrinter/utils';
import _ from "lodash";
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { logger } from '@/logging/logger';

export class Controller {
  private receiptService = Container.get<BaseService<ReceiptTemplate, any>>('receiptService');
  private printerService = Container.get<BaseService<Printers, any>>('printerService');

  public receiptListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const results = await this.receiptService.findWithCustomKey('id', req.params?.id);
        responseSuccess(res, { message: 'Success', data: results });
      } else {
        const results = await this.receiptService.findAll(paginationParams, ['name'], {}, {});
        responseSuccess(res, { message: 'Success', data: results?.data, meta: results?.meta });
      }
    }),
  ];

  public receiptCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;

      const inputData = {
        ...req.body,
      }

      if (recordId && recordId !== 'all') {
        await this.receiptService.update(recordId, inputData);
      }

      if (!recordId) {
        await this.receiptService.create(inputData, 'name');
      }

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public testPrint = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const code = req.body.code || 'C3';
      let printer = null;
      const results = await this.receiptService.findWithCustomKey('code', code);
      if(!_.isEmpty(results?.printerId)){
        printer = await this.printerService.findWithCustomKey('id', results?.printerId);
      }
      const html = await generateReceiptHtml({ elements: results.elements, previewData: results.preview, record: results });
      logger.debug('Test print triggered', { hasPrinter: Boolean(printer), code });

      print({
        printer,
        receiptData: html
      }, req.userId);

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public receiptDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      await this.receiptService.delete(req.params.id);
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];
}
