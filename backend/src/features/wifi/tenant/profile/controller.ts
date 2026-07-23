import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  canSwitchOrgContext,
  hasGlobalOrgAccess,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { TenantProfileUpdateSchema } from './schema';

const licenseBriefSelect = {
  id: true,
  status: true,
  billingCycle: true,
  stationLimit: true,
  currentActiveStationCount: true,
  currency: true,
  effectiveFrom: true,
  expiresAt: true,
} satisfies Prisma.OrgLicenseSelect;

const profileSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  timezone: true,
  currency: true,
  isActive: true,
  stationCodePrefix: true,
  planCodePrefix: true,
  resellerCodePrefix: true,
  enableAnnouncement: true,
  announcement: true,
  createdAt: true,
  updatedAt: true,
  orgLicense: { select: licenseBriefSelect },
} satisfies Prisma.OrgSelect;

type ProfileRow = Prisma.OrgGetPayload<{ select: typeof profileSelect }>;

async function countActiveStations(prisma: PrismaClient, orgId: string): Promise<number> {
  return prisma.wifiStation.count({
    where: { orgId, deletedAt: null, status: 'ACTIVE' },
  });
}

function enrichProfile(
  org: ProfileRow,
  activeStationCount: number,
  memberCount: number,
  totalStationCount: number
) {
  const license = org.orgLicense;
  const stationLimit = license?.stationLimit ?? 0;
  const usagePercent =
    license && stationLimit > 0
      ? Math.min(100, Math.round((activeStationCount / stationLimit) * 100))
      : 0;

  return {
    ...org,
    activeStationCount,
    totalStationCount,
    memberCount,
    usagePercent,
    isNearLimit: Boolean(license && usagePercent >= 85),
    isAtLimit: Boolean(license && activeStationCount >= stationLimit),
    remainingSlots: license ? Math.max(0, stationLimit - activeStationCount) : null,
    hasLicense: Boolean(license),
  };
}

async function loadProfile(prisma: PrismaClient, orgId: string) {
  const org = await prisma.org.findFirst({
    where: { id: orgId, deletedAt: null },
    select: profileSelect,
  });

  if (!org) {
    return null;
  }

  const [activeStationCount, totalStationCount, memberCount, planCount] = await Promise.all([
    countActiveStations(prisma, orgId),
    prisma.wifiStation.count({ where: { orgId, deletedAt: null } }),
    prisma.orgMember.count({ where: { orgId, deletedAt: null } }),
    prisma.plan.count({ where: { orgId, deletedAt: null } }),
  ]);

  return {
    profile: enrichProfile(org, activeStationCount, memberCount, totalStationCount),
    meta: { planCount },
  };
}

/** menus.wifi.tenant.profile @route /wifi/tenant/profile */
export class TenantProfileController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const user = req.user!;
      const isDeveloper = isDeveloperAdmin(user);
      const requestedOrgId =
        typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

      if (req.query.formOptions === 'true') {
        const memberships = await loadOrgMembershipOptions(
          this.prisma,
          adminId,
          hasGlobalOrgAccess(user)
        );
        return responseSuccess(res, {
          message: 'Success',
          data: { memberships },
        });
      }

      try {
        const resolved = await resolveOrgIdForAdmin(
          this.prisma,
          adminId,
          user,
          requestedOrgId || undefined
        );

        if ('requiresSelection' in resolved) {
          return responseSuccess(res, {
            message: 'Success',
            data: null,
            meta: {
              requiresOrgSelection: true,
              memberships: resolved.memberships,
            },
          });
        }

        const loaded = await loadProfile(this.prisma, resolved.orgId);
        if (!loaded) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Organization not found.' });
        }

        const memberships = await loadOrgMembershipOptions(
          this.prisma,
          adminId,
          hasGlobalOrgAccess(user)
        );

        return responseSuccess(res, {
          message: 'Success',
          data: loaded.profile,
          meta: {
            ...loaded.meta,
            memberships,
            canSwitchOrg: canSwitchOrgContext(user),
          },
        });
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 400, {
          code: e.code ?? 'ORG_RESOLVE_FAILED',
          message: e.message ?? 'Unable to resolve organization.',
        });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const user = req.user!;
      const requestedOrgId =
        typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

      const { error, value } = TenantProfileUpdateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      try {
        const resolved = await resolveOrgIdForAdmin(
          this.prisma,
          adminId,
          user,
          requestedOrgId || undefined
        );

        if ('requiresSelection' in resolved) {
          return responseError(res, 400, {
            code: 'ORG_REQUIRED',
            message: 'Select an organization before saving profile settings.',
          });
        }

        const updated = await this.prisma.org.update({
          where: { id: resolved.orgId },
          data: {
            ...(value.name !== undefined && { name: value.name }),
            ...(value.description !== undefined && {
              description: value.description || null,
            }),
            ...(value.timezone !== undefined && { timezone: value.timezone }),
            ...(value.currency !== undefined && { currency: value.currency }),
            ...(value.enableAnnouncement !== undefined && {
              enableAnnouncement: value.enableAnnouncement,
            }),
            ...(value.announcement !== undefined && {
              announcement: value.announcement || null,
            }),
            ...(value.stationCodePrefix !== undefined && {
              stationCodePrefix: value.stationCodePrefix || '',
            }),
            ...(value.planCodePrefix !== undefined && {
              planCodePrefix: value.planCodePrefix || '',
            }),
            ...(value.resellerCodePrefix !== undefined && {
              resellerCodePrefix: value.resellerCodePrefix || '',
            }),
          },
          select: profileSelect,
        });

        const [activeStationCount, totalStationCount, memberCount] = await Promise.all([
          countActiveStations(this.prisma, updated.id),
          this.prisma.wifiStation.count({ where: { orgId: updated.id, deletedAt: null } }),
          this.prisma.orgMember.count({ where: { orgId: updated.id, deletedAt: null } }),
        ]);

        responseSuccess(res, {
          message: 'Profile updated',
          data: enrichProfile(updated, activeStationCount, memberCount, totalStationCount),
        });
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 400, {
          code: e.code ?? 'ORG_RESOLVE_FAILED',
          message: e.message ?? 'Unable to update organization profile.',
        });
      }
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Organization profile cannot be deleted from this screen.',
      });
    }),
  ];
}
