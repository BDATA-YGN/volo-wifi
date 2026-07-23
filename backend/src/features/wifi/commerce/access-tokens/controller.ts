import crypto from 'crypto';
import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { isDeveloperAdmin } from '@/features/wifi/shared/resolve-org';
import {
  loadOrgMembershipsForAdmin,
  loadResellerPicker,
  resolveResellerContext,
} from '@/features/wifi/commerce/shared/resolve-reseller';
import {
  CAPTIVE_SESSION_PREVIEW_LIMIT,
  CREDENTIAL_STATUSES,
  type CredentialStatus,
} from './constants';
import { loadAccessTokenRevokeWindowMinutes } from './commerce-settings';
import {
  assertCredentialActionAllowed,
  resolveCredentialActions,
  type CredentialPermissionContext,
} from './credential-permissions';
import {
  pauseAccessToken,
  revertAccessTokenToSold,
  unlockAccessToken,
} from './credential-lifecycle';
import { CommerceAccessTokensActionSchema, CommerceAccessTokensIssueSchema } from './schema';
import { revokeAccessToken } from './revoke-access-token';
import { generateUniqueAlphanumericToken } from '@/features/shared/credentials/voucher-token';
import {
  countAvailableVoucherSlots,
  InsufficientVoucherInventoryError,
  reserveVoucherBatchSlots,
} from './voucher-inventory';

const credentialSelect = {
  id: true,
  orgId: true,
  type: true,
  status: true,
  token: true,
  planId: true,
  stationId: true,
  resellerId: true,
  soldAt: true,
  activatedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  plan: {
    select: { id: true, code: true, name: true, quotaType: true, isActive: true },
  },
  station: {
    select: { id: true, code: true, name: true, status: true },
  },
  reseller: {
    select: { id: true, code: true, name: true, status: true },
  },
  salesItems: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      unitPrice: true,
      lineTotal: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          total: true,
          currency: true,
          soldAt: true,
        },
      },
    },
  },
  _count: {
    select: { captivePortalSessions: true },
  },
} satisfies Prisma.CredentialSelect;

type CredentialRow = Prisma.CredentialGetPayload<{ select: typeof credentialSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function serializeCredential(
  row: CredentialRow,
  permissionCtx: CredentialPermissionContext,
  revokeWindowMinutes: number
) {
  const saleItem = row.salesItems[0];
  const actions = resolveCredentialActions(
    permissionCtx,
    { status: row.status, soldAt: row.soldAt },
    revokeWindowMinutes
  );
  return {
    id: row.id,
    orgId: row.orgId,
    type: row.type,
    status: row.status,
    token: row.token,
    planId: row.planId,
    stationId: row.stationId,
    resellerId: row.resellerId,
    plan: row.plan,
    station: row.station,
    reseller: row.reseller,
    soldAt: row.soldAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    captiveSessionCount: row._count.captivePortalSessions,
    actions,
    sale: saleItem
      ? {
          itemId: saleItem.id,
          unitPrice: decimalToNumber(saleItem.unitPrice),
          lineTotal: decimalToNumber(saleItem.lineTotal),
          order: {
            ...saleItem.order,
            total: decimalToNumber(saleItem.order.total),
            soldAt: saleItem.order.soldAt?.toISOString() ?? null,
          },
        }
      : null,
  };
}

function revokeSuccessMessage(result: Awaited<ReturnType<typeof revokeAccessToken>>): string {
  if (result.orderStatus === 'REFUNDED') {
    return 'Access token revoked and linked sale refunded';
  }
  if (result.refundedAmount != null && result.refundedAmount > 0) {
    return 'Access token revoked and linked payment adjusted';
  }
  return 'Access token revoked';
}

function generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SO-${date}-${rand}`;
}

function queryResellerParams(query: AuthenticatedRequest['query']) {
  return {
    orgId: typeof query.orgId === 'string' ? query.orgId : undefined,
    resellerId: typeof query.resellerId === 'string' ? query.resellerId : undefined,
  };
}

async function resolveRetailPrice(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  stationId: string,
  planId: string
): Promise<{ price: Prisma.Decimal; priceBookId: string } | null> {
  const station = await prisma.wifiStation.findFirst({
    where: { id: stationId, orgId, deletedAt: null },
    select: { id: true, stationSizeId: true },
  });
  if (!station) return null;

  // Empty allow-list = all plans; otherwise plan must be offered at this site.
  const offerCount = await prisma.stationPlanOffer.count({
    where: { orgId, stationId },
  });
  if (offerCount > 0) {
    const offered = await prisma.stationPlanOffer.findFirst({
      where: { orgId, stationId, planId },
      select: { id: true },
    });
    if (!offered) return null;
  }

  const books = await prisma.planPriceBook.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [
        { stations: { some: { stationId } } },
        { resellers: { some: { resellerId } } },
        { stationSizeId: station.stationSizeId },
        { isDefault: true },
      ],
    },
    select: {
      id: true,
      isDefault: true,
      stationSizeId: true,
      stations: { select: { stationId: true } },
      resellers: { select: { resellerId: true } },
    },
  });

  const bookIds = books.map((b) => b.id);
  if (bookIds.length === 0) return null;

  const prices = await prisma.planPrice.findMany({
    where: {
      orgId,
      deletedAt: null,
      isActive: true,
      planId,
      priceBookId: { in: bookIds },
    },
    select: { retailPrice: true, priceBookId: true },
  });

  const stationBook = books.find((b) => b.stations.some((s) => s.stationId === stationId));
  if (stationBook) {
    const match = prices.find((p) => p.priceBookId === stationBook.id);
    if (match) return { price: match.retailPrice, priceBookId: stationBook.id };
  }

  const resellerBook = books.find((b) => b.resellers.some((r) => r.resellerId === resellerId));
  if (resellerBook) {
    const match = prices.find((p) => p.priceBookId === resellerBook.id);
    if (match) return { price: match.retailPrice, priceBookId: resellerBook.id };
  }

  const tierBook = books.find(
    (b) =>
      b.stationSizeId === station.stationSizeId &&
      b.stations.length === 0 &&
      b.resellers.length === 0 &&
      !b.isDefault
  );
  if (tierBook) {
    const match = prices.find((p) => p.priceBookId === tierBook.id);
    if (match) return { price: match.retailPrice, priceBookId: tierBook.id };
  }

  const defaultBook = books.find((b) => b.isDefault);
  if (defaultBook) {
    const match = prices.find((p) => p.priceBookId === defaultBook.id);
    if (match) return { price: match.retailPrice, priceBookId: defaultBook.id };
  }

  return null;
}

async function loadSellableCatalog(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string
) {
  const [stations, entitlements, org] = await Promise.all([
    prisma.resellerStation.findMany({
      where: { orgId, resellerId, deletedAt: null },
      select: {
        station: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
      orderBy: { station: { name: 'asc' } },
    }),
    prisma.resellerPlanEntitlement.findMany({
      where: { resellerId, isEnabled: true, plan: { orgId, deletedAt: null, isActive: true } },
      select: {
        planId: true,
        plan: {
          select: { id: true, code: true, name: true, quotaType: true, isActive: true },
        },
      },
      orderBy: { plan: { name: 'asc' } },
    }),
    prisma.org.findUnique({
      where: { id: orgId },
      select: { currency: true },
    }),
  ]);

  const stationRows = stations
    .map((s) => s.station)
    .filter((s) => s.status !== 'DISABLED');

  const plans = await Promise.all(
    entitlements.map(async (ent) => {
      const firstStation = stationRows[0];
      let unitPrice: number | null = null;
      if (firstStation) {
        const resolved = await resolveRetailPrice(
          prisma,
          orgId,
          resellerId,
          firstStation.id,
          ent.planId
        );
        unitPrice = resolved ? decimalToNumber(resolved.price) : null;
      }
      return {
        ...ent.plan,
        unitPrice,
        hasPricing: unitPrice != null,
      };
    })
  );

  return {
    currency: org?.currency ?? 'MMK',
    stations: stationRows,
    plans,
    canSell: stationRows.length > 0 && plans.some((p) => p.hasPricing),
  };
}

function buildListWhere(
  orgId: string,
  resellerId: string,
  query: AuthenticatedRequest['query']
): Prisma.CredentialWhereInput {
  const where: Prisma.CredentialWhereInput = {
    orgId,
    resellerId,
    deletedAt: null,
    type: 'VOUCHER_TOKEN',
  };

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  if (status && (CREDENTIAL_STATUSES as readonly string[]).includes(status)) {
    where.status = status as CredentialStatus;
  }
  if (planId) where.planId = planId;
  if (stationId) where.stationId = stationId;

  if (search) {
    where.OR = [
      { token: { contains: search, mode: 'insensitive' } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { station: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/** menus.wifi.commerce.access-tokens @route /wifi/commerce/access-tokens */
export class CommerceAccessTokensController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const q = queryResellerParams(req.query);

      if (req.query.formOptions === 'true') {
        let orgId = q.orgId;
        let resellerId = q.resellerId;
        let mode: 'partner' | 'preview' | undefined;
        let requiresOrgSelection = false;
        let requiresResellerSelection = false;

        try {
          const ctx = await resolveResellerContext(this.prisma, adminId, req.user, q);
          if ('requiresOrgSelection' in ctx) {
            requiresOrgSelection = true;
          } else if ('requiresResellerSelection' in ctx) {
            orgId = orgId ?? ctx.orgId;
            requiresResellerSelection = true;
          } else {
            orgId = ctx.orgId;
            resellerId = ctx.resellerId;
            mode = ctx.mode;
          }
        } catch {
          orgId = orgId ?? undefined;
          resellerId = resellerId ?? undefined;
        }

        const [memberships, resellers] = await Promise.all([
          loadOrgMembershipsForAdmin(this.prisma, adminId, req.user!),
          orgId ? loadResellerPicker(this.prisma, orgId) : Promise.resolve([]),
        ]);

        let catalog = null;
        if (orgId && resellerId) {
          catalog = await loadSellableCatalog(this.prisma, orgId, resellerId);
        }

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers, catalog },
          meta: {
            mode,
            orgId,
            resellerId,
            requiresOrgSelection,
            requiresResellerSelection,
            resellers: requiresResellerSelection ? resellers : undefined,
            memberships: requiresOrgSelection || requiresResellerSelection ? memberships : undefined,
          },
        });
      }

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context) {
          return responseSuccess(res, {
            message: 'Success',
            data: [],
            meta: {
              requiresOrgSelection: true,
              memberships: context.memberships,
            },
          });
        }

        if ('requiresResellerSelection' in context) {
          const memberships = await loadOrgMembershipsForAdmin(
            this.prisma,
            adminId,
            req.user!
          );
          return responseSuccess(res, {
            message: 'Success',
            data: [],
            meta: {
              requiresResellerSelection: true,
              orgId: context.orgId,
              resellers: context.resellers,
              memberships,
            },
          });
        }

        const { orgId, resellerId, mode } = context;
        const permissionCtx: CredentialPermissionContext = { mode, isDeveloper };
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);

        if (!isUndefinedOrUndefinedString(req.params?.id)) {
          const idParam = req.params.id as string | string[];
          const id = Array.isArray(idParam) ? idParam[0] : idParam;

          const row = await this.prisma.credential.findFirst({
            where: { id, orgId, resellerId, deletedAt: null },
            select: credentialSelect,
          });

          if (!row) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Access token not found.',
            });
          }

          const sessions = await this.prisma.captivePortalSession.findMany({
            where: { credentialId: id, orgId },
            select: {
              id: true,
              username: true,
              ip: true,
              mac: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: CAPTIVE_SESSION_PREVIEW_LIMIT,
          });

          const sessionTotal = await this.prisma.captivePortalSession.count({
            where: { credentialId: id, orgId },
          });

          return responseSuccess(res, {
            message: 'Success',
            data: {
              ...serializeCredential(row, permissionCtx, revokeWindowMinutes),
              captiveSessions: sessions.map((s) => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
              })),
              captiveSessionsTotal: sessionTotal,
              captiveSessionsTruncated: sessionTotal > CAPTIVE_SESSION_PREVIEW_LIMIT,
            },
          });
        }

        const where = buildListWhere(orgId, resellerId, req.query);
        const { page, limit, skip, take } = parsePagination(req.query);
        const todayStart = startOfUtcDay();

        const [
          rows,
          total,
          statusGroups,
          todayOrders,
          todayRevenue,
          catalog,
          memberships,
          resellers,
        ] = await Promise.all([
          this.prisma.credential.findMany({
            where,
            select: credentialSelect,
            orderBy: [{ createdAt: 'desc' }],
            skip,
            take,
          }),
          this.prisma.credential.count({ where }),
          this.prisma.credential.groupBy({
            by: ['status'],
            where: { orgId, resellerId, deletedAt: null, type: 'VOUCHER_TOKEN' },
            _count: { _all: true },
          }),
          this.prisma.saleOrder.count({
            where: {
              orgId,
              resellerId,
              soldAt: { gte: todayStart },
              status: 'PAID',
            },
          }),
          this.prisma.saleOrder.aggregate({
            where: {
              orgId,
              resellerId,
              soldAt: { gte: todayStart },
              status: 'PAID',
            },
            _sum: { total: true },
          }),
          loadSellableCatalog(this.prisma, orgId, resellerId),
          mode === 'preview'
            ? loadOrgMembershipsForAdmin(this.prisma, adminId, req.user!)
            : Promise.resolve(undefined),
          mode === 'preview'
            ? loadResellerPicker(this.prisma, orgId)
            : Promise.resolve(undefined),
        ]);

        const statusCounts = Object.fromEntries(
          statusGroups.map((g) => [g.status, g._count._all])
        );

        responseSuccess(res, {
          message: 'Success',
          data: rows.map((row) => serializeCredential(row, permissionCtx, revokeWindowMinutes)),
          meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            mode,
            orgId,
            resellerId,
            revokeWindowMinutes,
            statusCounts,
            todayOrders,
            todayRevenue: decimalToNumber(todayRevenue._sum.total),
            catalog,
            memberships,
            resellers,
          },
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ACCESS_TOKENS_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to load access tokens.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const recordId = (req.params?.id as string) ?? null;
      const isRevoke = Boolean(recordId && recordId !== 'all');

      const q = queryResellerParams(req.query);

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context || 'requiresResellerSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select a partner context before issuing tokens.',
          });
        }

        const { orgId, resellerId, mode } = context;
        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);
        const elevated = isDeveloper || mode === 'preview';

        if (isRevoke) {
          const existing = await this.prisma.credential.findFirst({
            where: { id: recordId!, orgId, resellerId, deletedAt: null },
            select: { status: true, soldAt: true },
          });
          if (!existing) {
            return responseError(res, 404, { code: 'NOT_FOUND', message: 'Access token not found.' });
          }
          const actions = resolveCredentialActions(
            { mode, isDeveloper },
            existing,
            revokeWindowMinutes
          );
          assertCredentialActionAllowed(actions, 'revoke');

          const result = await this.prisma.$transaction((tx) =>
            revokeAccessToken(
              tx,
              { orgId, resellerId, credentialId: recordId! },
              {
                elevated,
                enforceRevokeWindow: !elevated,
                revokeWindowMinutes,
              }
            )
          );

          return responseSuccess(res, {
            message: revokeSuccessMessage(result),
            data: result,
          });
        }

        const { error, value } = CommerceAccessTokensIssueSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const reseller = await this.prisma.reseller.findFirst({
          where: { id: resellerId, orgId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true, code: true },
        });

        if (!reseller) {
          return responseError(res, 403, {
            code: 'RESELLER_INACTIVE',
            message: 'Partner account is not active.',
          });
        }

        const stationMapped = await this.prisma.resellerStation.findFirst({
          where: {
            orgId,
            resellerId,
            stationId: value.stationId,
            deletedAt: null,
            station: { deletedAt: null, status: { not: 'DISABLED' } },
          },
          select: { id: true },
        });

        if (!stationMapped) {
          return responseError(res, 400, {
            code: 'STATION_NOT_MAPPED',
            message: 'Selected site is not mapped to this partner.',
          });
        }

        const entitled = await this.prisma.resellerPlanEntitlement.findFirst({
          where: {
            resellerId,
            planId: value.planId,
            isEnabled: true,
            plan: { orgId, deletedAt: null, isActive: true },
          },
          select: { id: true },
        });

        if (!entitled) {
          return responseError(res, 400, {
            code: 'PLAN_NOT_ENTITLED',
            message: 'This plan is not enabled for this partner.',
          });
        }

        const priceResult = await resolveRetailPrice(
          this.prisma,
          orgId,
          resellerId,
          value.stationId,
          value.planId
        );

        if (!priceResult) {
          return responseError(res, 400, {
            code: 'NO_PRICE',
            message: 'No retail price is configured for this plan at this site.',
          });
        }

        const unitPrice = priceResult.price;
        const quantity = value.quantity as number;
        const lineSubtotal = unitPrice.mul(quantity);
        const discount = new Prisma.Decimal(value.discount ?? 0);
        const total = Prisma.Decimal.max(new Prisma.Decimal(0), lineSubtotal.sub(discount));

        const org = await this.prisma.org.findUnique({
          where: { id: orgId },
          select: { currency: true },
        });

        const orderNo = generateOrderNo();
        const soldAt = new Date();

        const availableSlots = await countAvailableVoucherSlots(
          this.prisma,
          orgId,
          value.planId,
          value.stationId
        );
        if (availableSlots < quantity) {
          return responseError(res, 409, {
            code: 'INSUFFICIENT_VOUCHER_INVENTORY',
            message:
              availableSlots <= 0
                ? 'No voucher capacity is available for this plan and site. Create a voucher run first.'
                : `Only ${availableSlots} voucher slot${availableSlots === 1 ? '' : 's'} available (requested ${quantity}).`,
          });
        }

        const result = await this.prisma.$transaction(async (tx) => {
          const batchIds = await reserveVoucherBatchSlots(
            tx,
            orgId,
            value.planId,
            value.stationId,
            quantity
          );

          const order = await tx.saleOrder.create({
            data: {
              orgId,
              orderNo,
              status: 'PAID',
              resellerId,
              stationId: value.stationId,
              subtotal: lineSubtotal,
              discount,
              total,
              currency: org?.currency ?? 'MMK',
              note: value.note || null,
              soldAt,
            },
            select: { id: true, orderNo: true, total: true, currency: true },
          });

          await tx.payment.create({
            data: {
              orgId,
              orderId: order.id,
              method: value.paymentMethod,
              amount: total,
              paidAt: soldAt,
              note: value.note || null,
            },
          });

          const credentials: CredentialRow[] = [];

          for (let i = 0; i < quantity; i += 1) {
            const token = await generateUniqueAlphanumericToken(tx);
            const voucherBatchId = batchIds[i]!;

            const credential = await tx.credential.create({
              data: {
                orgId,
                type: 'VOUCHER_TOKEN',
                status: 'SOLD',
                planId: value.planId,
                token,
                stationId: value.stationId,
                resellerId,
                voucherBatchId,
                soldAt,
              },
              select: credentialSelect,
            });

            await tx.saleItem.create({
              data: {
                orgId,
                orderId: order.id,
                planId: value.planId,
                credentialId: credential.id,
                qty: 1,
                unitPrice,
                lineTotal: unitPrice,
              },
            });

            credentials.push(credential);
          }

          return { order, credentials };
        });

        return responseSuccess(res, {
          status: 201,
          message:
            result.credentials.length === 1
              ? 'Access token issued'
              : `${result.credentials.length} access tokens issued`,
          data: {
            order: {
              ...result.order,
              total: decimalToNumber(result.order.total),
            },
            credentials: result.credentials.map((row) =>
              serializeCredential(
                row,
                { mode, isDeveloper: isDeveloperAdmin(req.user!) },
                revokeWindowMinutes
              )
            ),
          },
        });
      } catch (err: unknown) {
        if (err instanceof InsufficientVoucherInventoryError) {
          return responseError(res, err.status, { code: err.code, message: err.message });
        }
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ISSUE_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to issue access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const q = queryResellerParams(req.query);

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context || 'requiresResellerSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select a partner context before revoking tokens.',
          });
        }

        const { orgId, resellerId, mode } = context;
        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);
        const elevated = isDeveloper || mode === 'preview';

        const existing = await this.prisma.credential.findFirst({
          where: { id, orgId, resellerId, deletedAt: null },
          select: { status: true, soldAt: true },
        });
        if (!existing) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Access token not found.' });
        }
        const actions = resolveCredentialActions(
          { mode, isDeveloper },
          existing,
          revokeWindowMinutes
        );
        assertCredentialActionAllowed(actions, 'revoke');

        const result = await this.prisma.$transaction((tx) =>
          revokeAccessToken(
            tx,
            { orgId, resellerId, credentialId: id },
            {
              elevated,
              enforceRevokeWindow: !elevated,
              revokeWindowMinutes,
            }
          )
        );

        responseSuccess(res, {
          message: revokeSuccessMessage(result),
          data: result,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'REVOKE_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to revoke access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public applyAction = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const q = queryResellerParams(req.query);

      const { error, value } = CommerceAccessTokensActionSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context || 'requiresResellerSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select a partner context before changing token status.',
          });
        }

        const { orgId, resellerId, mode } = context;
        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);

        const existing = await this.prisma.credential.findFirst({
          where: { id, orgId, resellerId, deletedAt: null },
          select: { status: true, soldAt: true },
        });
        if (!existing) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Access token not found.' });
        }

        const actions = resolveCredentialActions(
          { mode, isDeveloper },
          existing,
          revokeWindowMinutes
        );
        assertCredentialActionAllowed(actions, value.action);

        await this.prisma.$transaction(async (tx) => {
          const params = { orgId, resellerId, credentialId: id };
          if (value.action === 'pause') {
            await pauseAccessToken(tx, params);
          } else if (value.action === 'unlock') {
            await unlockAccessToken(tx, params);
          } else {
            await revertAccessTokenToSold(tx, params);
          }
        });

        const row = await this.prisma.credential.findFirst({
          where: { id, orgId, resellerId, deletedAt: null },
          select: credentialSelect,
        });

        const actionLabels: Record<string, string> = {
          pause: 'paused',
          unlock: 'unlocked',
          revertToSold: 'reverted to sold',
        };

        responseSuccess(res, {
          message: `Access token ${actionLabels[value.action] ?? 'updated'}`,
          data: row
            ? serializeCredential(row, { mode, isDeveloper }, revokeWindowMinutes)
            : null,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ACTION_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to update access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];
}
