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
import { DEFAULT_WINDOW_HOURS, WINDOW_HOURS_OPTIONS, type WindowHours } from './constants';
import { AnalyticsLiveOpsQuerySchema } from './schema';
import {
  buildLiveOpsAnalytics,
  type LiveOpsAnalyticsPayload,
} from './build-live-ops-analytics';

function parseWindowHours(value: unknown): WindowHours {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if ((WINDOW_HOURS_OPTIONS as readonly number[]).includes(n)) {
    return n as WindowHours;
  }
  return DEFAULT_WINDOW_HOURS;
}

/** menus.wifi.analytics.live-ops @route /wifi/analytics/live-ops */
export class AnalyticsLiveOpsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsLiveOpsQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const [memberships, stations, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgIdParam
            ? this.prisma.reseller.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, stations, resellers },
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
      const resellerId =
        typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : undefined;
      const windowHours = parseWindowHours(req.query.windowHours);

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

      if (resellerId) {
        const reseller = await this.prisma.reseller.findFirst({
          where: { id: resellerId, orgId: orgIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!reseller) {
          return responseError(res, 400, {
            code: 'INVALID_RESELLER',
            message: 'Partner not found in this organization.',
          });
        }
      }

      const analytics = await buildLiveOpsAnalytics(
        this.prisma,
        orgIdParam,
        windowHours,
        { stationId, resellerId }
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: LiveOpsAnalyticsPayload & {
        scopeStationId: string | null;
        scopeResellerId: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        scopeStationId: stationId ?? null,
        scopeResellerId: resellerId ?? null,
        org: org!,
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
        message: 'Live operations analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Live operations analytics are read-only.',
      });
    }),
  ];
}
