import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { NotificationTemplateSchema, NotificationTemplateUpdateSchema } from './schema';
import { WebSocketService } from '@/third-party/bdataSocket';
import PrismaDBConnection from '@/prisma/prisma-client';
import { SIO_EVENTS } from '@/third-party/bdataSocket/sioConstants';

const prisma = PrismaDBConnection.getConnection();

function renderTemplate(template: string, payload: Record<string, unknown> | null | undefined): string {
  if (!template) return '';
  const data = payload ?? {};
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => {
    const v = (data as any)[key];
    return v == null ? '' : String(v);
  });
}

export class Controller {
  public templateListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;
      const id = req.params?.id ? Number(req.params.id) : null;

      if (id && !isNaN(id)) {
        const template = await prisma.notificationTemplate.findUnique({
          where: { id },
        });
        responseSuccess(res, { message: 'Success', data: template });
      } else {
        const templates = await prisma.notificationTemplate.findMany({
          skip: Number(paginationParams.offset) || 0,
          take: Number(paginationParams.limit) || 10,
          where: {
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });

        const totalCount = await prisma.notificationTemplate.count({
          where: { deletedAt: null },
        });

        responseSuccess(res, {
          message: 'Success',
          data: templates,
          meta: {
            currentPage: Number(paginationParams.page) || 1,
            totalPages: Math.ceil(totalCount / (Number(paginationParams.limit) || 10)),
            totalRows: totalCount,
          }
        });
      }
    }),
  ];

  public templateCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const payload = req.body;

      if (recordId && recordId !== 'all') {
        const { error } = NotificationTemplateUpdateSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
        }

        const updateData: any = {
          ...payload,
        };

        await prisma.notificationTemplate.update({
          where: { id: Number(recordId) },
          data: updateData,
        });
      } else if (!recordId) {
        const { error } = NotificationTemplateSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
        }

        await prisma.notificationTemplate.create({
          data: {
            code: payload.code,
            name: payload.name,
            titleTemplate: payload.titleTemplate,
            bodyTemplate: payload.bodyTemplate,
            payloadSchema: payload.payloadSchema || undefined,
            defaultChannel: payload.defaultChannel,
            priority: payload.priority,
            isActive: payload.isActive,
          },
        });
      }
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public sendNotification = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { templateCode, payload } = req.body;
      const socketService = WebSocketService.getInstance();

      const template = await prisma.notificationTemplate.findUnique({
        where: { code: templateCode },
      });

      if (!template) {
        return responseError(res, 404, { code: '404', message: 'Template not found' });
      }

      const renderedTitle = renderTemplate(template.titleTemplate, payload);
      const renderedBody = renderTemplate(template.bodyTemplate, payload);

      await socketService.smartNotify({
        event: SIO_EVENTS.REGISTER_CONSOLE_ADMIN,
        eventId: process.env.NODE_ENV === 'development' ? 'general_development' : 'general_production',
        type: 'notification',
        data: {
          title: renderedTitle,
          body: renderedBody,
          payload: payload,
          priority: 'HIGH',
          tag: 'SYSTEM'
        },
        timestamp: new Date()
      });

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public templateDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const id = Number(req.params?.id);
      if (isNaN(id)) {
        return responseError(res, 400, { code: '400', message: 'Invalid ID' });
      }
      await prisma.notificationTemplate.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public notificationLogs = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;
      const logs = await prisma.notification.findMany({
        skip: Number(paginationParams.offset) || 0,
        take: Number(paginationParams.limit) || 10,
        include: { template: true },
        orderBy: { createdAt: 'desc' },
      });
      const totalCount = await prisma.notification.count();
      responseSuccess(res, {
        message: 'Success',
        data: logs,
        meta: {
          currentPage: Number(paginationParams.page) || 1,
          totalPages: Math.ceil(totalCount / (Number(paginationParams.limit) || 10)),
          totalRows: totalCount,
        }
      });
    }),
  ];

  public notificationRecipients = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;
      const recipients = await prisma.notificationRecipient.findMany({
        skip: Number(paginationParams.offset) || 0,
        take: Number(paginationParams.limit) || 10,
        where: { deletedAt: null },
        include: { notification: true },
        orderBy: { createdAt: 'desc' },
      });
      const totalCount = await prisma.notificationRecipient.count({
        where: { deletedAt: null },
      });
      responseSuccess(res, {
        message: 'Success',
        data: recipients,
        meta: {
          currentPage: Number(paginationParams.page) || 1,
          totalPages: Math.ceil(totalCount / (Number(paginationParams.limit) || 10)),
          totalRows: totalCount,
        }
      });
    }),
  ];

  public notificationSettings = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;
      const settings = await prisma.userNotificationSetting.findMany({
        skip: Number(paginationParams.offset) || 0,
        take: Number(paginationParams.limit) || 10,
        orderBy: { createdAt: 'desc' },
      });
      const totalCount = await prisma.userNotificationSetting.count();
      responseSuccess(res, {
        message: 'Success',
        data: settings,
        meta: {
          currentPage: Number(paginationParams.page) || 1,
          totalPages: Math.ceil(totalCount / (Number(paginationParams.limit) || 10)),
          totalRows: totalCount,
        }
      });
    }),
  ];
}
