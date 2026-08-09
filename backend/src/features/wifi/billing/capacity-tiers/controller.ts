import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { platformCodeTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  BillingCapacityTiersCreateSchema,
  BillingCapacityTiersUpdateSchema,
} from './schema';

const tierSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  sortOrder: true,
  isActive: true,
  tokenUsageScope: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      stations: true,
      globalLicensePrices: { where: { isActive: true } },
      orgLicensePrices: { where: { isActive: true } },
    },
  },
} satisfies Prisma.StationSizeSelect;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function buildWhere(query: AuthenticatedRequest['query']): Prisma.StationSizeWhereInput {
  const where: Prisma.StationSizeWhereInput = {};
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.isActive === 'true') where.isActive = true;
  if (query.isActive === 'false') where.isActive = false;

  return where;
}

/** menus.wifi.billing.capacity-tiers @route /wifi/billing/capacity-tiers */
export class BillingCapacityTiersController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const row = await this.prisma.stationSize.findUnique({
          where: { id: req.params.id },
          select: tierSelect,
        });
        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Capacity tier not found.',
          });
        }
        return responseSuccess(res, { message: 'Success', data: row });
      }

      const { page, limit, skip, take } = parsePagination(req.query);
      const where = buildWhere(req.query);

      const [rows, total, activeCount, stationCount] = await Promise.all([
        this.prisma.stationSize.findMany({
          where,
          select: tierSelect,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          skip,
          take,
        }),
        this.prisma.stationSize.count({ where }),
        this.prisma.stationSize.count({ where: { ...where, isActive: true } }),
        this.prisma.wifiStation.count({
          where: {
            stationSizeId: { not: undefined },
            ...(where.isActive !== undefined ? { stationSize: { isActive: where.isActive } } : {}),
          },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          activeCount,
          stationCount,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? BillingCapacityTiersUpdateSchema
        : BillingCapacityTiersCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.stationSize.findUnique({
          where: { id: recordId! },
          select: { id: true, code: true, _count: { select: { stations: true } } },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Capacity tier not found.',
          });
        }

        if (value.code && value.code !== existing.code && existing._count.stations > 0) {
          return responseError(res, 409, {
            code: 'TIER_IN_USE',
            message: 'Cannot change the tier code while licensed sites reference it.',
          });
        }

        if (value.code && value.code !== existing.code) {
          const duplicate = await this.prisma.stationSize.findFirst({
            where: { code: value.code, id: { not: recordId! } },
            select: { id: true },
          });
          if (duplicate) {
            return responseError(res, 409, {
              code: 'CODE_EXISTS',
              message: platformCodeTakenMessage('Tier code', value.code),
            });
          }
        }

        const updated = await this.prisma.stationSize.update({
          where: { id: recordId! },
          data: {
            ...(value.code !== undefined ? { code: value.code } : {}),
            ...(value.name !== undefined ? { name: value.name } : {}),
            ...(value.description !== undefined
              ? { description: value.description || null }
              : {}),
            ...(value.sortOrder !== undefined ? { sortOrder: value.sortOrder } : {}),
            ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
            ...(value.tokenUsageScope !== undefined
              ? { tokenUsageScope: value.tokenUsageScope }
              : {}),
          },
          select: tierSelect,
        });

        return responseSuccess(res, { message: 'Capacity tier updated', data: updated });
      }

      const duplicate = await this.prisma.stationSize.findFirst({
        where: { code: value.code },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'CODE_EXISTS',
          message: platformCodeTakenMessage('Tier code', value.code),
        });
      }

      const created = await this.prisma.stationSize.create({
        data: {
          code: value.code,
          name: value.name,
          description: value.description || null,
          sortOrder: value.sortOrder ?? 0,
          isActive: value.isActive ?? true,
          tokenUsageScope: value.tokenUsageScope ?? 'ALL',
        },
        select: tierSelect,
      });

      responseSuccess(res, { message: 'Capacity tier created', data: created });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const id = req.params.id;
      const existing = await this.prisma.stationSize.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          _count: {
            select: {
              stations: true,
              globalLicensePrices: true,
              orgLicensePrices: true,
            },
          },
        },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Capacity tier not found.',
        });
      }

      const inUse =
        existing._count.stations > 0 ||
        existing._count.globalLicensePrices > 0 ||
        existing._count.orgLicensePrices > 0;

      if (inUse) {
        return responseError(res, 409, {
          code: 'TIER_IN_USE',
          message:
            'This tier is referenced by sites or license pricing. Deactivate it instead of deleting.',
        });
      }

      await this.prisma.stationSize.delete({ where: { id } });
      responseSuccess(res, { message: 'Capacity tier deleted', data: { id } });
    }),
  ];
}
