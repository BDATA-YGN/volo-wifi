import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import type { PriceBookScope } from './constants';
import {
  CatalogRetailPricingBookCreateSchema,
  CatalogRetailPricingBookUpdateSchema,
  CatalogRetailPricingPriceCreateSchema,
  CatalogRetailPricingPriceUpdateSchema,
} from './schema';

const bookSelect = {
  id: true,
  orgId: true,
  name: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  stations: {
    select: {
      station: {
        select: { id: true, code: true, name: true, status: true },
      },
    },
  },
  resellers: {
    select: {
      reseller: {
        select: { id: true, code: true, name: true, status: true },
      },
    },
  },
  _count: {
    select: {
      prices: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.PlanPriceBookSelect;

const planBriefSelect = {
  id: true,
  code: true,
  name: true,
  quotaType: true,
  isActive: true,
} satisfies Prisma.PlanSelect;

const priceSelect = {
  id: true,
  orgId: true,
  priceBookId: true,
  planId: true,
  retailPrice: true,
  costPrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  plan: { select: planBriefSelect },
} satisfies Prisma.PlanPriceSelect;

type BookRow = Prisma.PlanPriceBookGetPayload<{ select: typeof bookSelect }>;
type PriceRow = Prisma.PlanPriceGetPayload<{ select: typeof priceSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

async function resolveOrgFromRequest(
  prisma: PrismaClient,
  req: AuthenticatedRequest
): Promise<string> {
  const adminId = req.userId!;
  const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
  const resolved = await resolveOrgIdForAdmin(
    prisma,
    adminId,
    req.user!,
    requestedOrgId || undefined
  );
  if ('requiresSelection' in resolved) {
    throw Object.assign(new Error('Select an organization to manage retail pricing.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

function deriveScope(book: {
  isDefault: boolean;
  stations: unknown[];
  resellers: unknown[];
}): PriceBookScope {
  if (book.resellers.length > 0) return 'RESELLER';
  if (book.stations.length > 0) return 'STATION';
  return 'DEFAULT';
}

function serializeBook(row: BookRow) {
  const stations = row.stations.map((link) => link.station);
  const resellers = row.resellers.map((link) => link.reseller);
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    isDefault: row.isDefault,
    scope: deriveScope({ isDefault: row.isDefault, stations, resellers }),
    stationIds: stations.map((s) => s.id),
    resellerIds: resellers.map((r) => r.id),
    stations,
    resellers,
    reseller: resellers[0] ?? null,
    station: stations[0] ?? null,
    _count: row._count,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializePrice(row: PriceRow) {
  return {
    ...row,
    retailPrice: decimalToString(row.retailPrice)!,
    costPrice: decimalToString(row.costPrice),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildBookWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.PlanPriceBookWhereInput {
  const where: Prisma.PlanPriceBookWhereInput = { orgId, deletedAt: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const scope = typeof query.scope === 'string' ? query.scope.trim().toUpperCase() : '';

  if (scope === 'DEFAULT') {
    where.isDefault = true;
    where.stations = { none: {} };
    where.resellers = { none: {} };
  } else if (scope === 'RESELLER') {
    where.resellers = { some: {} };
  } else if (scope === 'STATION') {
    where.stations = { some: {} };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { resellers: { some: { reseller: { name: { contains: search, mode: 'insensitive' } } } } },
      { resellers: { some: { reseller: { code: { contains: search, mode: 'insensitive' } } } } },
      { stations: { some: { station: { name: { contains: search, mode: 'insensitive' } } } } },
      { stations: { some: { station: { code: { contains: search, mode: 'insensitive' } } } } },
    ];
  }

  return where;
}

async function assertScopeRefs(
  prisma: PrismaClient,
  orgId: string,
  scope: PriceBookScope,
  resellerIds: string[],
  stationIds: string[]
): Promise<string | null> {
  if (scope === 'RESELLER' && resellerIds.length > 0) {
    const count = await prisma.reseller.count({
      where: { id: { in: resellerIds }, orgId, deletedAt: null },
    });
    if (count !== resellerIds.length) {
      return 'One or more selected resellers are invalid for this organization.';
    }
  }
  if (scope === 'STATION' && stationIds.length > 0) {
    const count = await prisma.wifiStation.count({
      where: { id: { in: stationIds }, orgId, deletedAt: null },
    });
    if (count !== stationIds.length) {
      return 'One or more selected sites are invalid for this organization.';
    }
  }
  return null;
}

async function syncBookLinks(
  tx: Prisma.TransactionClient,
  priceBookId: string,
  scope: PriceBookScope,
  resellerIds: string[],
  stationIds: string[]
): Promise<void> {
  await tx.planPriceBookStation.deleteMany({ where: { priceBookId } });
  await tx.planPriceBookReseller.deleteMany({ where: { priceBookId } });

  if (scope === 'STATION' && stationIds.length > 0) {
    await tx.planPriceBookStation.createMany({
      data: stationIds.map((stationId) => ({ priceBookId, stationId })),
      skipDuplicates: true,
    });
  }
  if (scope === 'RESELLER' && resellerIds.length > 0) {
    await tx.planPriceBookReseller.createMany({
      data: resellerIds.map((resellerId) => ({ priceBookId, resellerId })),
      skipDuplicates: true,
    });
  }
}

/** menus.wifi.catalog.retail-pricing @route /wifi/catalog/retail-pricing */
export class CatalogRetailPricingController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        if (orgIdParam) {
          orgId = orgIdParam;
        } else {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const [memberships, plans, resellers, stations] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId
            ? this.prisma.plan.findMany({
                where: { orgId, deletedAt: null, isActive: true },
                select: planBriefSelect,
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.reseller.findMany({
                where: { orgId, deletedAt: null, status: 'ACTIVE' },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.wifiStation.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, plans, resellers, stations },
        });
      }

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ORG_REQUIRED';
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, status, { code, message });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const book = await this.prisma.planPriceBook.findFirst({
          where: { id, orgId, deletedAt: null },
          select: bookSelect,
        });

        if (!book) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Price book not found.',
          });
        }

        const prices = await this.prisma.planPrice.findMany({
          where: { priceBookId: id, orgId, deletedAt: null },
          select: priceSelect,
          orderBy: [{ isActive: 'desc' }, { plan: { name: 'asc' } }],
        });

        return responseSuccess(res, {
          message: 'Success',
          data: {
            ...serializeBook(book),
            prices: prices.map(serializePrice),
          },
        });
      }

      const where = buildBookWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, defaultCount, resellerBooks, siteBooks, activePrices] =
        await Promise.all([
          this.prisma.planPriceBook.findMany({
            where,
            select: bookSelect,
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            skip,
            take,
          }),
          this.prisma.planPriceBook.count({ where }),
          this.prisma.planPriceBook.count({
            where: { orgId, deletedAt: null, isDefault: true },
          }),
          this.prisma.planPriceBook.count({
            where: { orgId, deletedAt: null, resellers: { some: {} } },
          }),
          this.prisma.planPriceBook.count({
            where: { orgId, deletedAt: null, stations: { some: {} } },
          }),
          this.prisma.planPrice.count({
            where: { orgId, deletedAt: null, isActive: true },
          }),
        ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeBook),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          defaultCount,
          resellerBooks,
          siteBooks,
          activePrices,
          memberships: await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const { error, value } = (isUpdate
        ? CatalogRetailPricingBookUpdateSchema
        : CatalogRetailPricingBookCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.planPriceBook.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: {
            id: true,
            isDefault: true,
            stations: { select: { stationId: true } },
            resellers: { select: { resellerId: true } },
          },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Price book not found.',
          });
        }

        const existingStationIds = existing.stations.map((s) => s.stationId);
        const existingResellerIds = existing.resellers.map((r) => r.resellerId);
        const scope = (value.scope ??
          deriveScope({
            isDefault: existing.isDefault,
            stations: existing.stations,
            resellers: existing.resellers,
          })) as PriceBookScope;
        const stationIds =
          value.stationIds !== undefined ? (value.stationIds as string[]) : existingStationIds;
        const resellerIds =
          value.resellerIds !== undefined ? (value.resellerIds as string[]) : existingResellerIds;

        const refError = await assertScopeRefs(this.prisma, orgId, scope, resellerIds, stationIds);
        if (refError) {
          return responseError(res, 400, { code: 'VALIDATION_ERROR', message: refError });
        }

        const updated = await this.prisma.$transaction(async (tx) => {
          if (scope === 'DEFAULT') {
            await tx.planPriceBook.updateMany({
              where: { orgId, deletedAt: null, id: { not: recordId! } },
              data: { isDefault: false },
            });
          }

          await tx.planPriceBook.update({
            where: { id: recordId! },
            data: {
              ...(value.name !== undefined ? { name: value.name } : {}),
              isDefault: scope === 'DEFAULT',
            },
          });

          await syncBookLinks(tx, recordId!, scope, resellerIds, stationIds);

          return tx.planPriceBook.findFirstOrThrow({
            where: { id: recordId! },
            select: bookSelect,
          });
        });

        return responseSuccess(res, {
          message: 'Price book updated',
          data: serializeBook(updated),
        });
      }

      const scope = value.scope as PriceBookScope;
      const stationIds = (value.stationIds ?? []) as string[];
      const resellerIds = (value.resellerIds ?? []) as string[];
      const refError = await assertScopeRefs(this.prisma, orgId, scope, resellerIds, stationIds);
      if (refError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: refError });
      }

      const created = await this.prisma.$transaction(async (tx) => {
        if (scope === 'DEFAULT') {
          await tx.planPriceBook.updateMany({
            where: { orgId, deletedAt: null },
            data: { isDefault: false },
          });
        }

        const book = await tx.planPriceBook.create({
          data: {
            orgId,
            name: value.name,
            isDefault: scope === 'DEFAULT',
          },
          select: { id: true },
        });

        await syncBookLinks(tx, book.id, scope, resellerIds, stationIds);

        return tx.planPriceBook.findFirstOrThrow({
          where: { id: book.id },
          select: bookSelect,
        });
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Price book created',
        data: serializeBook(created),
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const existing = await this.prisma.planPriceBook.findFirst({
        where: { id, orgId, deletedAt: null },
        select: { id: true, isDefault: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Price book not found.',
        });
      }

      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.planPriceBook.update({
          where: { id },
          data: { deletedAt: now, isDefault: false },
        }),
        this.prisma.planPrice.updateMany({
          where: { priceBookId: id },
          data: { deletedAt: now, isActive: false },
        }),
      ]);

      responseSuccess(res, { message: 'Price book removed', data: { id } });
    }),
  ];

  public upsertPrice = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const priceIdParam = req.params.priceId as string | undefined;
      const isUpdate = Boolean(priceIdParam && priceIdParam !== 'all');

      const { error, value } = (isUpdate
        ? CatalogRetailPricingPriceUpdateSchema
        : CatalogRetailPricingPriceCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.planPrice.findFirst({
          where: { id: priceIdParam!, orgId, deletedAt: null },
          select: { id: true, priceBookId: true },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Plan price not found.',
          });
        }

        const updated = await this.prisma.planPrice.update({
          where: { id: priceIdParam! },
          data: {
            ...(value.retailPrice !== undefined
              ? { retailPrice: value.retailPrice }
              : {}),
            ...(value.costPrice !== undefined
              ? { costPrice: value.costPrice }
              : {}),
            ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
          },
          select: priceSelect,
        });

        return responseSuccess(res, {
          message: 'Plan price updated',
          data: serializePrice(updated),
        });
      }

      const book = await this.prisma.planPriceBook.findFirst({
        where: { id: value.priceBookId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!book) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Price book not found.',
        });
      }

      const plan = await this.prisma.plan.findFirst({
        where: { id: value.planId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!plan) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Selected plan is invalid for this organization.',
        });
      }

      const existingPrice = await this.prisma.planPrice.findFirst({
        where: {
          priceBookId: value.priceBookId,
          planId: value.planId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingPrice) {
        return responseError(res, 409, {
          code: 'PRICE_EXISTS',
          message: 'This plan already has a price in the selected book. Edit the existing row.',
        });
      }

      const created = await this.prisma.planPrice.create({
        data: {
          orgId,
          priceBookId: value.priceBookId,
          planId: value.planId,
          retailPrice: value.retailPrice,
          costPrice: value.costPrice ?? null,
          isActive: value.isActive ?? true,
        },
        select: priceSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Plan price created',
        data: serializePrice(created),
      });
    }),
  ];

  public removePrice = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const idParam = req.params.priceId as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const existing = await this.prisma.planPrice.findFirst({
        where: { id, orgId, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Plan price not found.',
        });
      }

      await this.prisma.planPrice.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      responseSuccess(res, { message: 'Plan price removed', data: { id } });
    }),
  ];
}
