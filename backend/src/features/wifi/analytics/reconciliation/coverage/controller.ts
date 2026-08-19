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
import type { EligibilityStatus } from './constants';
import { AnalyticsReconciliationCoverageQuerySchema } from './schema';
import {
  buildCoverageAnalytics,
  loadCoverageDetail,
  type CoverageAnalyticsPayload,
} from './build-coverage-analytics';

function allowedStationScope(ids: string[] | null): string[] | null {
  return ids && ids.length > 0 ? ids : null;
}

/** menus.wifi.analytics.reconciliation.coverage @route /wifi/analytics/reconciliation/coverage */
export class AnalyticsReconciliationCoverageController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const canSwitchOrg = canSwitchOrgContext(req.user!);

      const { error } = AnalyticsReconciliationCoverageQuerySchema.validate(req.query, {
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
        const allowedStationIds = orgIdParam
          ? allowedStationScope(
              await resolveAllowedStationIds(this.prisma, adminId, orgIdParam, req.user!)
            )
          : null;

        const [memberships, stations, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.wifiStation.findMany({
                where: {
                  orgId: orgIdParam,
                  deletedAt: null,
                  ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
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
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            stations,
            resellers,
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
          meta: { memberships: [], requiresOrgSelection: true, canSwitchOrg },
        });
      }

      const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      if (!orgIdParam) {
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

      const coverageId =
        typeof req.query.coverageId === 'string' ? req.query.coverageId.trim() : undefined;

      if (coverageId) {
        const detail = await loadCoverageDetail(this.prisma, orgIdParam, coverageId);
        if (!detail) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Coverage record not found.',
          });
        }

        const org = await this.prisma.org.findUnique({
          where: { id: orgIdParam },
          select: { id: true, name: true, code: true, currency: true },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: { detail, org: org! },
          meta: { memberships, orgId: orgIdParam, requiresOrgSelection: false, canSwitchOrg },
        });
      }

      const stationId =
        typeof req.query.stationId === 'string' ? req.query.stationId.trim() : undefined;
      const resellerId =
        typeof req.query.resellerId === 'string' ? req.query.resellerId.trim() : undefined;
      const eligibility =
        typeof req.query.eligibility === 'string'
          ? (req.query.eligibility.trim() as EligibilityStatus)
          : undefined;

      const allowedStationIds = allowedStationScope(
        await resolveAllowedStationIds(this.prisma, adminId, orgIdParam, req.user!)
      );

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

      const analytics = await buildCoverageAnalytics(this.prisma, orgIdParam, {
        stationId,
        resellerId,
        eligibility,
        allowedStationIds,
      });

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: CoverageAnalyticsPayload & {
        scopeStationId: string | null;
        scopeResellerId: string | null;
        scopeEligibility: string | null;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        scopeStationId: stationId ?? null,
        scopeResellerId: resellerId ?? null,
        scopeEligibility: eligibility ?? null,
        org: org!,
      };

      responseSuccess(res, {
        message: 'Success',
        data: payload,
        meta: {
          memberships,
          orgId: orgIdParam,
          requiresOrgSelection: false,
          canSwitchOrg,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Data coverage is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Data coverage is read-only.',
      });
    }),
  ];
}
