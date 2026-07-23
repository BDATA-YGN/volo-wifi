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
import { DEFAULT_PRESET, PERIOD_PRESETS, type PeriodPreset } from './constants';
import { AnalyticsReconciliationApprovalsQuerySchema } from './schema';
import {
  buildApprovalAnalytics,
  loadApprovalDetail,
  resolvePeriodFromPreset,
  type ApprovalAnalyticsPayload,
} from './build-approval-analytics';

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

/** menus.wifi.analytics.reconciliation.approvals @route /wifi/analytics/reconciliation/approvals */
export class AnalyticsReconciliationApprovalsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      const { error } = AnalyticsReconciliationApprovalsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
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

      const settlementId =
        typeof req.query.settlementId === 'string' ? req.query.settlementId.trim() : undefined;

      if (settlementId) {
        const detail = await loadApprovalDetail(this.prisma, orgIdParam, settlementId);
        if (!detail) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Settlement not found.',
          });
        }

        const org = await this.prisma.org.findUnique({
          where: { id: orgIdParam },
          select: { id: true, name: true, code: true, currency: true },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: { detail, org: org! },
          meta: { memberships, orgId: orgIdParam, requiresOrgSelection: false },
        });
      }

      const stationId =
        typeof req.query.stationId === 'string' ? req.query.stationId.trim() : undefined;
      const resellerId =
        typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : undefined;
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

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);
      const analytics = await buildApprovalAnalytics(
        this.prisma,
        orgIdParam,
        periodFrom,
        periodTo,
        { stationId, resellerId, status }
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: ApprovalAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
        scopeStationId: string | null;
        scopeResellerId: string | null;
        scopeStatus: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
        scopeStationId: stationId ?? null,
        scopeResellerId: resellerId ?? null,
        scopeStatus: status ?? null,
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
        message: 'Reconciliation approvals are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Reconciliation approvals are read-only.',
      });
    }),
  ];
}
