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
import { DEFAULT_PRESET, PERIOD_PRESETS, type PeriodPreset } from './constants';
import { AnalyticsTenantsQuerySchema } from './schema';
import {
  buildTenantAnalytics,
  resolvePeriodFromPreset,
  type TenantAnalyticsPayload,
} from './build-tenant-analytics';

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
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

/** menus.wifi.analytics.tenants @route /wifi/analytics/tenants */
export class AnalyticsTenantsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsTenantsQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const memberships = await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper);
      if (memberships.length === 0) {
        return responseSuccess(res, {
          message: 'No tenant access',
          data: null,
          meta: { memberships: [], isPlatformView: isDeveloper },
        });
      }

      const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      let orgIds = memberships.map((m) => m.id);

      if (orgIdParam) {
        const allowed = await canAccessOrg(this.prisma, adminId, orgIdParam, isDeveloper);
        if (!allowed) {
          return responseError(res, 403, {
            code: 'FORBIDDEN_ORG',
            message: 'You do not have access to this tenant.',
          });
        }
        orgIds = [orgIdParam];
      }

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);
      const analytics = await buildTenantAnalytics(this.prisma, orgIds, periodFrom, periodTo);

      const payload: TenantAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
        scopeOrgId: string | null;
      } = {
        ...analytics,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
        scopeOrgId: orgIdParam || null,
      };

      responseSuccess(res, {
        message: 'Success',
        data: payload,
        meta: {
          isPlatformView: isDeveloper && !orgIdParam,
          tenantCount: orgIds.length,
          memberships,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Tenant analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Tenant analytics are read-only.',
      });
    }),
  ];
}
