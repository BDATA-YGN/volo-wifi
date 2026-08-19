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
import { DEFAULT_PRESET, PERIOD_PRESETS, type PeriodPreset } from './constants';
import { AnalyticsServicePlansQuerySchema } from './schema';
import { startOfAppDay as startOfUtcDay, endOfAppDay as endOfUtcDay } from '@/utils/app-time';
import {
  buildPlanAnalytics,
  resolvePeriodFromPreset,
  type PlanAnalyticsPayload,
} from './build-plan-analytics';

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolvePeriod(query: AuthenticatedRequest['query']): {
  periodFrom: Date;
  periodTo: Date;
  preset: PeriodPreset | null;
} {
  const presetParam = typeof query.preset === 'string' ? query.preset.trim() : '';
  const preset = (PERIOD_PRESETS as readonly string[]).includes(presetParam)
    ? (presetParam as PeriodPreset)
    : null;

  const customFrom = parseDateParam(query.periodFrom);
  const customTo = parseDateParam(query.periodTo);

  if (customFrom && customTo) {
    return {
      periodFrom: startOfUtcDay(customFrom),
      periodTo: endOfUtcDay(customTo),
      preset: null,
    };
  }

  if (preset) {
    const resolved = resolvePeriodFromPreset(preset);
    return { ...resolved, preset };
  }

  const resolved = resolvePeriodFromPreset(DEFAULT_PRESET);
  return { ...resolved, preset: DEFAULT_PRESET };
}

/** menus.wifi.analytics.service-plans @route /wifi/analytics/service-plans */
export class AnalyticsServicePlansController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsServicePlansQuerySchema.validate(req.query, { abortEarly: false });
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
        const [memberships, plans, org, stations, resellers, profiles] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.plan.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  quotaType: true,
                  isActive: true,
                },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgIdParam
            ? this.prisma.org.findUnique({
                where: { id: orgIdParam },
                select: { currency: true },
              })
            : Promise.resolve(null),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: {
                  orgId: orgIdParam,
                  deletedAt: null,
                  ...(allowedStationIds && allowedStationIds.length > 0
                    ? { id: { in: allowedStationIds } }
                    : {}),
                },
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
            plans,
            stations,
            resellers,
            profiles: profiles
              .map((row) => row.vendor?.trim())
              .filter((v): v is string => Boolean(v))
              .map((v) => ({ value: v, label: v })),
            currency: org?.currency ?? 'MMK',
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

      const planId = typeof req.query.planId === 'string' ? req.query.planId.trim() : undefined;
      const stationId =
        typeof req.query.stationId === 'string' ? req.query.stationId.trim() : undefined;
      const resellerId =
        typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : undefined;
      const profile =
        typeof req.query.profile === 'string' ? req.query.profile.trim() : undefined;
      const quotaType =
        typeof req.query.quotaType === 'string' ? req.query.quotaType.trim() : undefined;

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

      if (resellerId) {
        const reseller = await this.prisma.reseller.findFirst({
          where: { id: resellerId, orgId: orgIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!reseller) {
          return responseError(res, 400, {
            code: 'INVALID_PARTNER',
            message: 'Partner not found in this organization.',
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
      if (profile) {
        const profileStations = await this.prisma.wifiStation.findMany({
          where: {
            orgId: orgIdParam,
            deletedAt: null,
            ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
            radiusVendorProfile: {
              is: {
                vendor: { equals: profile, mode: 'insensitive' },
                deletedAt: null,
              },
            },
          },
          select: { id: true },
        });
        scopedStationIds = profileStations.map((row) => row.id);
      }

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);
      const analytics = await buildPlanAnalytics(this.prisma, orgIdParam, periodFrom, periodTo, {
        planId,
        quotaType,
        stationId,
        resellerId,
        profile,
        allowedStationIds: scopedStationIds,
      });

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: PlanAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
        scopePlanId: string | null;
        scopeQuotaType: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
        scopePlanId: planId ?? null,
        scopeQuotaType: quotaType ?? null,
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
          canSwitchOrg: canSwitchOrgContext(req.user!),
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Plan analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Plan analytics are read-only.',
      });
    }),
  ];
}
