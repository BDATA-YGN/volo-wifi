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
import { AnalyticsRevenueQuerySchema } from './schema';
import {
  buildRevenueAnalytics,
  resolveSelectedMonth,
  type RevenueAnalyticsPayload,
} from './build-revenue-analytics';

function allowedStationScope(ids: string[] | null): string[] | null {
  return ids && ids.length > 0 ? ids : null;
}

/** menus.wifi.analytics.revenue @route /wifi/analytics/revenue */
export class AnalyticsRevenueController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const canSwitchOrg = canSwitchOrgContext(req.user!);

      const { error } = AnalyticsRevenueQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const [memberships, org] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgIdParam
            ? this.prisma.org.findUnique({
                where: { id: orgIdParam },
                select: { currency: true },
              })
            : Promise.resolve(null),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
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

      const selected = resolveSelectedMonth(
        typeof req.query.month === 'string' ? req.query.month : undefined
      );
      const allowedStationIds = allowedStationScope(
        await resolveAllowedStationIds(this.prisma, adminId, orgIdParam, req.user!)
      );

      const analytics = await buildRevenueAnalytics(
        this.prisma,
        orgIdParam,
        selected.year,
        selected.month,
        allowedStationIds
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: RevenueAnalyticsPayload & {
        periodFrom: string;
        periodTo: string;
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...analytics,
        periodFrom: selected.periodFrom.toISOString(),
        periodTo: selected.periodTo.toISOString(),
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
          canSwitchOrg,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Revenue analytics are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Revenue analytics are read-only.',
      });
    }),
  ];
}
