import { ValidationMiddleware } from '@/middlewares/validation.middleware';
import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Translation } from '@/generated/prisma/client';

export class Controller {
  private translationService = Container.get<BaseService<Translation, any>>('translationService');

  // Get all menu groups
  public getTranslationsByLocale = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { locale } = req.params;
      const translation = await this.translationService.baseModel().findFirst({
        where: { deletedAt: null, locale },
        select: { messages: true, id: true, locale: true },
      });
      responseSuccess(res, {
        message: 'Success',
        data: translation ?? { locale, messages: {}, id: null },
      });
    }),
  ];

  // Get a single menu group
  public updateTranslationByLocale = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { locale } = req.params;
      const { messages } = req.body;
      await this.translationService.baseModel().upsert({
        where: { locale },
        update: { messages },
        create: { locale, messages },
      });
      responseSuccess(res, { message: 'Success' });
    }),
  ];

  public getLocalLanguages = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const translation = await this.translationService.baseModel().findMany({
        where: { deletedAt: null }
      });
      responseSuccess(res, { message: 'Success', data: translation });
    }),
  ]

}
