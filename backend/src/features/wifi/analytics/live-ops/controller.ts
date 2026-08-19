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
import { resolveAllowedStationIds } from '@/features/wifi/shared/resolve-station-scope';
import { addAppDays, startOfAppDay } from '@/utils/app-time';
import { DATE_LOOKBACK_DAYS } from './constants';
import { AnalyticsLiveOpsQuerySchema } from './schema';
import {
  buildLiveOpsAnalytics,
  type LiveOpsAnalyticsPayload,
} from './build-live-ops-analytics';

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveSelectedDay(value: unknown): Date {
  const today = startOfAppDay(new Date());
  const earliest = addAppDays(today, -(DATE_LOOKBACK_DAYS - 1));
  const parsed = parseDateParam(value);
  const day = startOfAppDay(parsed ?? today);
  if (day.getTime() < earliest.getTime() || day.getTime() > today.getTime()) {
    return today;
  }
  return day;
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
        const allowedStationIdsRaw = orgIdParam
          ? await resolveAllowedStationIds(this.prisma, adminId, orgIdParam, req.user!)
          : null;
        const allowedStationIds =
          allowedStationIdsRaw && allowedStationIdsRaw.length > 0 ? allowedStationIdsRaw : null;

        const [memberships, stations, stationSizes, plans, profiles] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: {
                  orgId: orgIdParam,
                  deletedAt: null,
                  ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
                },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  status: true,
                  stationSizeId: true,
                },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          this.prisma.stationSize.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          }),
          orgIdParam
            ? this.prisma.plan.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true, isActive: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgIdParam
            ? this.prisma.radiusVendorProfile.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { vendor: true },
                distinct: ['vendor'],
                orderBy: { vendor: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            stations,
            stationSizes,
            plans,
            profiles: profiles
              .map((row) => row.vendor?.trim())
              .filter((v): v is string => Boolean(v))
              .map((v) => ({ value: v, label: v })),
            canSwitchOrg: canSwitchOrgContext(req.user!),
            requiresOrgSelection:
              canSwitchOrgContext(req.user!) || (!orgIdParam && memberships.length !== 1),
          },
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
      const planId = typeof req.query.planId === 'string' ? req.query.planId.trim() : undefined;
      const profile =
        typeof req.query.profile === 'string' ? req.query.profile.trim() : undefined;
      const dayStart = resolveSelectedDay(req.query.date);

      const allowedStationIdsRaw = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgIdParam,
        req.user!
      );
      const allowedStationIds =
        allowedStationIdsRaw && allowedStationIdsRaw.length > 0 ? allowedStationIdsRaw : null;

      if (stationId) {
        if (allowedStationIds && !allowedStationIds.includes(stationId)) {
          return responseError(res, 403, {
            code: 'FORBIDDEN_SITE',
            message: 'You do not have access to this site.',
          });
        }
        const station = await this.prisma.wifiStation.findFirst({
          where: { id: stationId, orgId: orgIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!station) {
          return responseError(res, 400, {
            code: 'INVALID_SITE',
            message: 'Site not found in this organization.',
          });
        }
      }

      if (planId) {
        const plan = await this.prisma.plan.findFirst({
          where: { id: planId, orgId: orgIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!plan) {
          return responseError(res, 400, {
            code: 'INVALID_PLAN',
            message: 'Service plan not found in this organization.',
          });
        }
      }

      let scopedStationIds: string[] | undefined = allowedStationIds || undefined;
      if (profile || stationSizeId) {
        const matched = await this.prisma.wifiStation.findMany({
          where: {
            orgId: orgIdParam,
            deletedAt: null,
            ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
            ...(stationSizeId ? { stationSizeId } : {}),
            ...(profile
              ? {
                  radiusVendorProfile: {
                    is: {
                      vendor: { equals: profile, mode: 'insensitive' },
                      deletedAt: null,
                    },
                  },
                }
              : {}),
          },
          select: { id: true },
        });
        scopedStationIds = matched.map((row) => row.id);
      }

      if (stationId && scopedStationIds && !scopedStationIds.includes(stationId)) {
        return responseError(res, 400, {
          code: 'SITE_FILTER_MISMATCH',
          message: 'Selected site does not match the profile or tier filter.',
        });
      }

      const analytics = await buildLiveOpsAnalytics(this.prisma, orgIdParam, dayStart, {
        stationId,
        allowedStationIds: stationId ? undefined : scopedStationIds,
        planId,
      });

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: LiveOpsAnalyticsPayload & {
        scopeStationId: string | null;
        scopeStationSizeId: string | null;
        scopePlanId: string | null;
        scopeProfile: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        scopeStationId: stationId ?? null,
        scopeStationSizeId: stationSizeId ?? null,
        scopePlanId: planId ?? null,
        scopeProfile: profile ?? null,
        org: org!,
      };

      responseSuccess(res, {
        message: 'Success',
        data: payload,
        meta: {
          memberships,
          orgId: orgIdParam,
          requiresOrgSelection: false,
          canSwitchOrg: canSwitchOrgContext(req.user!),
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
