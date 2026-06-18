import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  canAccessOrg,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import { AnalyticsNasInventoryQuerySchema } from './schema';
import { buildNasInventory, type NasInventoryPayload } from './build-nas-inventory';

/** menus.wifi.analytics.nas-inventory @route /wifi/analytics/nas-inventory */
export class AnalyticsNasInventoryController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsNasInventoryQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const [memberships, stations] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, stations },
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
            requiresOrgSelection: memberships.length > 1,
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
      const type = typeof req.query.type === 'string' ? req.query.type.trim() : undefined;
      const isRadiusClient =
        req.query.isRadiusClient === 'true'
          ? true
          : req.query.isRadiusClient === 'false'
            ? false
            : undefined;
      const unassigned = req.query.unassigned === 'true';

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

      const inventory = await buildNasInventory(this.prisma, orgIdParam, {
        stationId,
        type,
        isRadiusClient,
        unassigned: unassigned || undefined,
      });

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: NasInventoryPayload & {
        scopeStationId: string | null;
        scopeType: string | null;
        scopeRadiusClient: boolean | null;
        scopeUnassigned: boolean;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...inventory,
        scopeStationId: stationId ?? null,
        scopeType: type ?? null,
        scopeRadiusClient: isRadiusClient ?? null,
        scopeUnassigned: unassigned,
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
        message: 'NAS inventory is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'NAS inventory is read-only.',
      });
    }),
  ];
}
