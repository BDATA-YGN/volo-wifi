import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  canAccessOrg,
  canSwitchOrgContext,
  hasGlobalOrgAccess,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';
import { WifiOverviewQuerySchema } from './schema';
import {
  buildOverviewDashboard,
  type OverviewDashboardPayload,
} from './build-overview-dashboard';

/** menus.wifi.overview.dashboard @route /wifi */
export class WifiOverviewController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const globalAccess = hasGlobalOrgAccess(req.user!);
      const consoleRole = req.user?.role?.roleName ?? 'USER';

      const { error } = WifiOverviewQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (req.query.formOptions === 'true') {
        const memberships = await loadOrgMembershipOptions(this.prisma, adminId, globalAccess);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships },
        });
      }

      const memberships = await loadOrgMembershipOptions(this.prisma, adminId, globalAccess);
      const canSwitchOrg = canSwitchOrgContext(req.user!);

      if (memberships.length === 0) {
        return responseSuccess(res, {
          message: 'No tenant access',
          data: null,
          meta: { memberships: [], requiresOrgSelection: canSwitchOrg, canSwitchOrg },
        });
      }

      const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      if (!orgIdParam) {
        // Developers always pick; tenant users with one membership auto-scope.
        if (canSwitchOrg || memberships.length > 1) {
          return responseSuccess(res, {
            message: 'Organization required',
            data: null,
            meta: {
              memberships,
              requiresOrgSelection: true,
              canSwitchOrg,
            },
          });
        }

        const onlyOrgId = memberships[0].id;
        const dashboard = await buildOverviewDashboard(
          this.prisma,
          onlyOrgId,
          adminId,
          isDeveloper,
          consoleRole
        );
        const org = await this.prisma.org.findUnique({
          where: { id: onlyOrgId },
          select: { id: true, name: true, code: true, currency: true },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: { ...dashboard, org: org! },
          meta: {
            memberships,
            orgId: onlyOrgId,
            requiresOrgSelection: false,
            canSwitchOrg: false,
          },
        });
      }

      const allowed = await canAccessOrg(this.prisma, adminId, orgIdParam, globalAccess);
      if (!allowed) {
        return responseError(res, 403, {
          code: 'FORBIDDEN_ORG',
          message: 'You do not have access to this tenant.',
        });
      }

      const dashboard = await buildOverviewDashboard(
        this.prisma,
        orgIdParam,
        adminId,
        isDeveloper,
        consoleRole
      );

      const org = await this.prisma.org.findUnique({
        where: { id: orgIdParam },
        select: { id: true, name: true, code: true, currency: true },
      });

      const payload: OverviewDashboardPayload & {
        org: { id: string; name: string; code: string; currency: string };
      } = {
        ...dashboard,
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
        message: 'WiFi dashboard is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'WiFi dashboard is read-only.',
      });
    }),
  ];
}
