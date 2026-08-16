import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { loadResellerPicker } from '@/features/wifi/commerce/shared/resolve-commerce-scope';
import {
  canAccessOrg,
  canSwitchOrgContext,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import { DEFAULT_PRESET, PERIOD_PRESETS, type PeriodPreset } from './constants';
import { AnalyticsPartnersQuerySchema } from './schema';
import {
  resolveAllowedStationIds,
  stationPkScope,
} from '@/features/wifi/shared/resolve-station-scope';
import { startOfAppDay as startOfUtcDay, endOfAppDay as endOfUtcDay } from '@/utils/app-time';
import {
  buildPartnerAnalytics,
  resolvePeriodFromPreset,
  type PartnerAnalyticsPayload,
} from './build-partner-analytics';

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

/** menus.wifi.analytics.partners @route /wifi/analytics/partners */
export class AnalyticsPartnersController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsPartnersQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const allowedStationIds = orgIdParam
          ? await resolveAllowedStationIds(this.prisma, adminId, orgIdParam, req.user!)
          : null;
        const [memberships, resellers, stations, stationSizes, org] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? loadResellerPicker(this.prisma, orgIdParam, allowedStationIds)
            : Promise.resolve([]),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: { orgId: orgIdParam, deletedAt: null, ...stationPkScope(allowedStationIds) },
                select: {
                  id: true,
                  code: true,
                  name: true,
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
            ? this.prisma.org.findUnique({
                where: { id: orgIdParam },
                select: { currency: true },
              })
            : Promise.resolve(null),
        ]);

        const canSwitchOrg = canSwitchOrgContext(req.user!);
        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            resellers,
            stations,
            stationSizes,
            currency: org?.currency ?? 'MMK',
            canSwitchOrg,
            requiresOrgSelection: canSwitchOrg || (!orgIdParam && memberships.length !== 1),
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
        const canSwitchOrg = canSwitchOrgContext(req.user!);
        return responseSuccess(res, {
          message: 'Organization required',
          data: null,
          meta: {
            memberships,
            requiresOrgSelection: canSwitchOrg || memberships.length > 1,
            canSwitchOrg,
            orgId: canSwitchOrg ? undefined : memberships.length === 1 ? memberships[0].id : undefined,
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

      const resellerId =
        typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : undefined;

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

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);
      const source = preset === 'today' ? 'live' : 'aggregated';
      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgIdParam,
        req.user!
      );
      const analytics = await buildPartnerAnalytics(
        this.prisma,
        orgIdParam,
        periodFrom,
        periodTo,
        { resellerId, stationIds: allowedStationIds ?? undefined },
        { source }
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: PartnerAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
        scopeResellerId: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
        scopeResellerId: resellerId ?? null,
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
        message: 'Partner analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Partner analytics are read-only.',
      });
    }),
  ];
}
