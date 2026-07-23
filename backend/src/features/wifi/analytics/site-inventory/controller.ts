import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  canAccessOrg,
  canSwitchOrgContext,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import { AnalyticsSiteInventoryQuerySchema } from './schema';
import {
  buildSiteInventory,
  type SiteInventoryPayload,
} from './build-site-inventory';

/** menus.wifi.analytics.site-inventory @route /wifi/analytics/site-inventory */
export class AnalyticsSiteInventoryController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsSiteInventoryQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const [memberships, stationSizes, stations] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          this.prisma.stationSize.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          }),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true, status: true, stationSizeId: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, stationSizes, stations },
        });
      }

      const memberships = await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper);
      if (memberships.length === 0) {
        return responseSuccess(res, {
          message: 'No tenant access',
          data: null,
          meta: { memberships: [], requiresOrgSelection: true },
        });
      }

      const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      if (!orgIdParam) {
        return responseSuccess(res, {
          message: 'Organization required',
          data: null,
          meta: {
            memberships,
            requiresOrgSelection: canSwitchOrgContext(req.user!) || memberships.length > 1,
            canSwitchOrg: canSwitchOrgContext(req.user!),
            orgId: memberships.length === 1 ? memberships[0].id : undefined,
          },
        });
      }

      const allowed = await canAccessOrg(this.prisma, adminId, orgIdParam, isDeveloper);
      if (!allowed) {
        return responseError(res, 403, {
          code: 'FORBIDDEN_ORG',
          message: 'You do not have access to this tenant.',
        });
      }

      const stationId =
        typeof req.query.stationId === 'string' ? req.query.stationId.trim() : undefined;
      const stationSizeId =
        typeof req.query.stationSizeId === 'string' ? req.query.stationSizeId.trim() : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;

      if (stationId) {
        const station = await this.prisma.wifiStation.findFirst({
          where: { id: stationId, orgId: orgIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!station) {
          return responseError(res, 400, {
            code: 'INVALID_STATION',
            message: 'Site not found in this organization.',
          });
        }
      }

      if (stationSizeId) {
        const tier = await this.prisma.stationSize.findFirst({
          where: { id: stationSizeId, isActive: true },
          select: { id: true },
        });
        if (!tier) {
          return responseError(res, 400, {
            code: 'INVALID_TIER',
            message: 'Capacity tier not found.',
          });
        }
      }

      const inventory = await buildSiteInventory(this.prisma, orgIdParam, {
        stationId,
        stationSizeId,
        status,
      });

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: SiteInventoryPayload & {
        scopeStationId: string | null;
        scopeStationSizeId: string | null;
        scopeStatus: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...inventory,
        scopeStationId: stationId ?? null,
        scopeStationSizeId: stationSizeId ?? null,
        scopeStatus: status ?? null,
        org: {
          id: org!.id,
          name: org!.name,
          code: org!.code,
          currency: org!.currency,
        },
      };

      responseSuccess(res, {
        message: 'Success',
        data: payload,
        meta: {
          memberships,
          orgId: orgIdParam,
          requiresOrgSelection: false,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Site inventory is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Site inventory is read-only.',
      });
    }),
  ];
}
