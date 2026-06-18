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
import { AnalyticsAccessTokensQuerySchema } from './schema';
import {
  buildCredentialAnalytics,
  resolvePeriodFromPreset,
  type CredentialAnalyticsPayload,
} from './build-credential-analytics';

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

/** menus.wifi.analytics.access-tokens @route /wifi/analytics/access-tokens */
export class AnalyticsAccessTokensController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsAccessTokensQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const [memberships, plans] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.plan.findMany({
                where: { orgId: orgIdParam, deletedAt: null },
                select: { id: true, code: true, name: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, plans },
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

      const planId = typeof req.query.planId === 'string' ? req.query.planId.trim() : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type.trim() : undefined;

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

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);
      const analytics = await buildCredentialAnalytics(
        this.prisma,
        orgIdParam,
        periodFrom,
        periodTo,
        { planId, type }
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: CredentialAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
        scopePlanId: string | null;
        scopeType: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
        scopePlanId: planId ?? null,
        scopeType: type ?? null,
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
        message: 'Access token analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Access token analytics are read-only.',
      });
    }),
  ];
}
