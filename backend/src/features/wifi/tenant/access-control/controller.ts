import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { hashPassword } from '@/utils/password';
import {
  consoleUsernameTakenMessage,
  orgTeamMemberExistsMessage,
} from '@/features/wifi/shared/conflict-messages';
import { revokeConsoleSessionsIfFullyBlocked } from '@/features/wifi/shared/org-membership-auth';
import {
  canSwitchOrgContext,
  hasGlobalOrgAccess,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { PROVISION_MEMBER_ROLE_CODES, LOCKED_MEMBER_ROLE_CODES, isLockedMemberRoleCode, normalizeMemberRoleCode, pickConsoleRoleName } from './constants';
import {
  TenantAccessControlCreateSchema,
  TenantAccessControlUpdateSchema,
  TenantAccessControlResetPasswordSchema,
} from './schema';

/** Access Control lists tenant staff only — Partner accounts live under Partners. */
function staffMemberRoleFilter(): Prisma.OrgMemberRoleListRelationFilter {
  return {
    some: {
      deletedAt: null,
      isActive: true,
      roleCode: { in: [...PROVISION_MEMBER_ROLE_CODES] },
    },
  };
}

const memberSelect = {
  id: true,
  orgId: true,
  adminId: true,
  status: true,
  isPrimary: true,
  title: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  admin: {
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phoneNumber: true,
      isActive: true,
      isBlocked: true,
      lastLogin: true,
    },
  },
  roles: {
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      roleCode: true,
      scopeKey: true,
      stationId: true,
      resellerId: true,
      isActive: true,
      effectiveFrom: true,
    },
  },
  stationScopes: {
    select: {
      id: true,
      stationId: true,
      station: { select: { id: true, code: true, name: true, status: true } },
    },
  },
} satisfies Prisma.OrgMemberSelect;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

async function resolveOrgFromRequest(
  prisma: PrismaClient,
  req: AuthenticatedRequest
): Promise<string> {
  const adminId = req.userId!;
  const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
  const resolved = await resolveOrgIdForAdmin(
    prisma,
    adminId,
    req.user!,
    requestedOrgId || undefined
  );
  if ('requiresSelection' in resolved) {
    throw Object.assign(new Error('Select an organization to manage access control.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

async function syncMemberRoles(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgMemberId: string,
  roleCodes: string[],
  assignedByAdminId: string
) {
  // Never add/remove Admin (ORG_ADMIN) or Partner here — platform ADMIN/DEVELOPER are not member roles.
  const uniqueCodes = [...new Set(roleCodes)].filter((code) => !isLockedMemberRoleCode(code));
  const existing = await tx.orgMemberRole.findMany({
    where: {
      orgMemberId,
      deletedAt: null,
      scopeKey: '',
      roleCode: { notIn: [...LOCKED_MEMBER_ROLE_CODES] },
    },
    select: { id: true, roleCode: true },
  });

  const existingCodes = new Set(existing.map((r) => r.roleCode));
  const targetCodes = new Set(uniqueCodes);

  const toDeactivate = existing.filter((r) => !targetCodes.has(r.roleCode));
  const toAdd = uniqueCodes.filter((code) => !existingCodes.has(code));

  if (toDeactivate.length) {
    await tx.orgMemberRole.updateMany({
      where: { id: { in: toDeactivate.map((r) => r.id) } },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  for (const roleCode of toAdd) {
    await tx.orgMemberRole.create({
      data: {
        orgId,
        orgMemberId,
        roleCode,
        scopeKey: '',
        isActive: true,
        effectiveFrom: new Date(),
        assignedByAdminId,
      },
    });
  }
}

async function syncStationScopes(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgMemberId: string,
  stationIds: string[]
) {
  const uniqueIds = [...new Set(stationIds)];
  const existing = await tx.orgMemberStation.findMany({
    where: { orgMemberId },
    select: { id: true, stationId: true },
  });

  const existingIds = new Set(existing.map((r) => r.stationId));
  const targetIds = new Set(uniqueIds);

  const toRemove = existing.filter((r) => !targetIds.has(r.stationId));
  const toAdd = uniqueIds.filter((id) => !existingIds.has(id));

  if (toRemove.length) {
    await tx.orgMemberStation.deleteMany({
      where: { id: { in: toRemove.map((r) => r.id) } },
    });
  }

  if (toAdd.length) {
    await tx.orgMemberStation.createMany({
      data: toAdd.map((stationId) => ({ orgId, orgMemberId, stationId })),
    });
  }
}

async function validateStationsForOrg(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[]
): Promise<string | null> {
  if (!stationIds.length) return null;
  const count = await prisma.wifiStation.count({
    where: { id: { in: stationIds }, orgId, deletedAt: null },
  });
  if (count !== stationIds.length) {
    return 'One or more selected sites are invalid for this organization.';
  }
  return null;
}

async function assertNotLastPrimaryContact(
  prisma: PrismaClient,
  orgId: string,
  memberId: string,
  nextStatus?: string,
  nextIsPrimary?: boolean
): Promise<string | null> {
  const member = await prisma.orgMember.findFirst({
    where: { id: memberId, orgId, deletedAt: null },
    select: { isPrimary: true },
  });
  if (!member) return 'Member not found.';
  if (!member.isPrimary) return null;

  const demotingPrimary = nextIsPrimary === false;
  const disabling = nextStatus && nextStatus !== 'ACTIVE';

  if (!demotingPrimary && !disabling) return null;

  const otherPrimaries = await prisma.orgMember.count({
    where: {
      orgId,
      deletedAt: null,
      status: 'ACTIVE',
      isPrimary: true,
      id: { not: memberId },
    },
  });

  if (otherPrimaries === 0) {
    return 'At least one active primary organization contact is required for this tenant.';
  }

  return null;
}

/** menus.wifi.tenant.access-control @route /wifi/tenant/access-control */
export class TenantAccessControlController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        let orgId: string | undefined;
        if (orgIdParam) {
          orgId = orgIdParam;
        } else {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const [memberships, stations, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, hasGlobalOrgAccess(req.user!)),
          orgId
            ? this.prisma.wifiStation.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.reseller.findMany({
                where: { orgId, deletedAt: null },
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
            roleCodes: PROVISION_MEMBER_ROLE_CODES,
            canSwitchOrg: canSwitchOrgContext(req.user!),
            requiresOrgSelection: canSwitchOrgContext(req.user!) && !orgId,
          },
        });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const orgId = await resolveOrgFromRequest(this.prisma, req);

        const member = await this.prisma.orgMember.findFirst({
          where: {
            id,
            orgId,
            deletedAt: null,
            roles: staffMemberRoleFilter(),
          },
          select: memberSelect,
        });

        if (!member) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Team member not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: member });
      }

      const requestedOrgId =
        typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      const resolved = await resolveOrgIdForAdmin(
        this.prisma,
        adminId,
        req.user!,
        requestedOrgId || undefined
      );

      if ('requiresSelection' in resolved) {
        return responseSuccess(res, {
          message: 'Success',
          data: [],
          meta: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            activeCount: 0,
            suspendedCount: 0,
            roleAssignments: 0,
            memberships: resolved.memberships,
            requiresOrgSelection: true,
            canSwitchOrg: true,
          },
        });
      }

      const orgId = resolved.orgId;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
      const roleCodeRaw =
        typeof req.query.roleCode === 'string' ? req.query.roleCode.trim().toUpperCase() : '';
      const { page, limit, skip, take } = parsePagination(req.query);

      const where: Prisma.OrgMemberWhereInput = {
        orgId,
        deletedAt: null,
        roles: staffMemberRoleFilter(),
      };

      if (status && ['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(status)) {
        where.status = status;
      }

      if (
        roleCodeRaw &&
        (PROVISION_MEMBER_ROLE_CODES as readonly string[]).includes(roleCodeRaw)
      ) {
        where.roles = {
          some: {
            deletedAt: null,
            isActive: true,
            roleCode: roleCodeRaw,
          },
        };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { admin: { fullName: { contains: search, mode: 'insensitive' } } },
          { admin: { username: { contains: search, mode: 'insensitive' } } },
          { admin: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const staffScope: Prisma.OrgMemberWhereInput = {
        orgId,
        deletedAt: null,
        roles: staffMemberRoleFilter(),
      };

      const [rows, total, activeCount, suspendedCount, roleAssignments] = await Promise.all([
        this.prisma.orgMember.findMany({
          where,
          select: memberSelect,
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          skip,
          take,
        }),
        this.prisma.orgMember.count({ where }),
        this.prisma.orgMember.count({ where: { ...staffScope, status: 'ACTIVE' } }),
        this.prisma.orgMember.count({
          where: { ...staffScope, status: 'SUSPENDED' },
        }),
        this.prisma.orgMemberRole.count({
          where: {
            deletedAt: null,
            isActive: true,
            roleCode: { in: [...PROVISION_MEMBER_ROLE_CODES] },
            orgMember: { orgId, deletedAt: null },
          },
        }),
      ]);

      const memberships = await loadOrgMembershipOptions(
        this.prisma,
        adminId,
        hasGlobalOrgAccess(req.user!)
      );

      responseSuccess(res, {
        message: 'Success',
        data: rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
          suspendedCount,
          roleAssignments,
          memberships,
          canSwitchOrg: canSwitchOrgContext(req.user!),
          requiresOrgSelection: false,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');
      const actorAdminId = req.userId!;
      const orgId = await resolveOrgFromRequest(this.prisma, req);

      if (isUpdate) {
        const { error, value } = TenantAccessControlUpdateSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const existing = await this.prisma.orgMember.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: {
            id: true,
            adminId: true,
            roles: {
              where: { deletedAt: null, isActive: true },
              select: { roleCode: true },
            },
          },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Team member not found.',
          });
        }

        const ownerCheck = await assertNotLastPrimaryContact(
          this.prisma,
          orgId,
          recordId!,
          value.status as string | undefined,
          value.isPrimary as boolean | undefined
        );
        if (ownerCheck) {
          return responseError(res, 400, { code: 'OWNER_REQUIRED', message: ownerCheck });
        }

        if (value.stationIds) {
          const stationError = await validateStationsForOrg(
            this.prisma,
            orgId,
            value.stationIds as string[]
          );
          if (stationError) {
            return responseError(res, 400, { code: 'INVALID_STATIONS', message: stationError });
          }
        }

        const nextRoleCodes =
          (value.roleCodes as string[] | undefined) ?? existing.roles.map((r) => r.roleCode);
        const isOrgAdmin = nextRoleCodes.some(
          (code) => normalizeMemberRoleCode(code) === 'ORG_ADMIN'
        );
        if (value.isPrimary === true && !isOrgAdmin) {
          return responseError(res, 400, {
            code: 'PRIMARY_REQUIRES_ORG_ADMIN',
            message: 'Only ORG_ADMIN members can be set as primary membership.',
          });
        }
        let nextIsPrimary: boolean | undefined;
        if (!isOrgAdmin) {
          nextIsPrimary = false;
        } else if (value.isPrimary !== undefined) {
          nextIsPrimary = Boolean(value.isPrimary);
        }

        if (nextIsPrimary === true) {
          await this.prisma.orgMember.updateMany({
            where: { orgId, deletedAt: null, id: { not: recordId! } },
            data: { isPrimary: false },
          });
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.orgMember.update({
            where: { id: recordId! },
            data: {
              ...(value.title !== undefined && { title: value.title || null }),
              ...(value.status !== undefined && { status: value.status }),
              ...(nextIsPrimary !== undefined && { isPrimary: nextIsPrimary }),
            },
          });

          if (value.roleCodes) {
            await syncMemberRoles(
              tx,
              orgId,
              recordId!,
              value.roleCodes as string[],
              actorAdminId
            );
          }
          if (value.stationIds) {
            await syncStationScopes(tx, orgId, recordId!, value.stationIds as string[]);
          }

          const nextPassword =
            typeof value.password === 'string' ? value.password.trim() : '';
          if (nextPassword) {
            const hashedPassword = await hashPassword(nextPassword);
            await tx.admin.update({
              where: { id: existing.adminId },
              data: { password: hashedPassword, updatedBy: actorAdminId },
            });
          }
        });

        if (value.status === 'SUSPENDED' || value.status === 'DISABLED') {
          await revokeConsoleSessionsIfFullyBlocked(this.prisma, existing.adminId);
        }

        const updated = await this.prisma.orgMember.findFirst({
          where: { id: recordId! },
          select: memberSelect,
        });

        return responseSuccess(res, { message: 'Member updated', data: updated });
      }

      const { error, value } = TenantAccessControlCreateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const stationError = await validateStationsForOrg(
        this.prisma,
        orgId,
        (value.stationIds as string[]) ?? []
      );
      if (stationError) {
        return responseError(res, 400, { code: 'INVALID_STATIONS', message: stationError });
      }

      const username = (value.username as string).trim();

      const consoleRoleName = pickConsoleRoleName(value.roleCodes as string[]);
      const consoleRole = await this.prisma.mngRoles.findFirst({
        where: { roleName: consoleRoleName, deletedAt: null },
        select: { roleId: true },
      });

      if (!consoleRole) {
        return responseError(res, 500, {
          code: 'ROLE_NOT_FOUND',
          message: `${consoleRoleName} console role is not configured.`,
        });
      }

      const existingAdmin = await this.prisma.admin.findFirst({
        where: { username, deletedAt: null },
        select: { id: true },
      });
      if (existingAdmin) {
        return responseError(res, 409, {
          code: 'USERNAME_EXISTS',
          message: consoleUsernameTakenMessage(username),
        });
      }

      const hashedPassword = await hashPassword(value.password as string);
      const createdAdmin = await this.prisma.admin.create({
        data: {
          fullName: (value.fullName as string).trim(),
          username,
          email: value.email?.trim() || null,
          phoneNumber: value.phoneNumber?.trim() || null,
          password: hashedPassword,
          roleId: consoleRole.roleId,
          isActive: true,
          isVerified: true,
          isBlocked: false,
          createdBy: actorAdminId,
        },
        select: { id: true },
      });
      const targetAdminId = createdAdmin.id;

      const duplicateMember = await this.prisma.orgMember.findFirst({
        where: { orgId, adminId: targetAdminId, deletedAt: null },
        select: { id: true },
      });

      if (duplicateMember) {
        return responseError(res, 409, {
          code: 'MEMBER_EXISTS',
          message: orgTeamMemberExistsMessage(),
        });
      }

      if (value.isPrimary) {
        await this.prisma.orgMember.updateMany({
          where: { orgId, deletedAt: null },
          data: { isPrimary: false },
        });
      }

      const member = await this.prisma.$transaction(async (tx) => {
        const row = await tx.orgMember.create({
          data: {
            orgId,
            adminId: targetAdminId,
            status: (value.status as string) || 'ACTIVE',
            isPrimary: false,
            title: value.title?.trim() || null,
            createdByAdminId: actorAdminId,
            joinedAt: new Date(),
          },
          select: { id: true },
        });

        await syncMemberRoles(tx, orgId, row.id, value.roleCodes as string[], actorAdminId);
        await syncStationScopes(tx, orgId, row.id, (value.stationIds as string[]) ?? []);

        return row.id;
      });

      const created = await this.prisma.orgMember.findFirst({
        where: { id: member },
        select: memberSelect,
      });

      responseSuccess(res, { status: 201, message: 'Member provisioned', data: created });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const idParam = req.params?.id as string;
      const orgId = await resolveOrgFromRequest(this.prisma, req);

      const ownerCheck = await assertNotLastPrimaryContact(
        this.prisma,
        orgId,
        idParam,
        'DISABLED',
        undefined
      );
      if (ownerCheck) {
        return responseError(res, 400, { code: 'OWNER_REQUIRED', message: ownerCheck });
      }

      const existing = await this.prisma.orgMember.findFirst({
        where: { id: idParam, orgId, deletedAt: null },
        select: { id: true, adminId: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Team member not found.',
        });
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.orgMemberRole.updateMany({
          where: { orgMemberId: idParam, deletedAt: null },
          data: { isActive: false, deletedAt: new Date() },
        });
        await tx.orgMemberStation.deleteMany({ where: { orgMemberId: idParam } });
        await tx.orgMember.update({
          where: { id: idParam },
          data: { status: 'DISABLED', deletedAt: new Date(), isPrimary: false },
        });
      });

      await revokeConsoleSessionsIfFullyBlocked(this.prisma, existing.adminId);

      responseSuccess(res, { message: 'Member removed' });
    }),
  ];

  public resetPassword = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const idParam = req.params?.id as string;
      const actorAdminId = req.userId!;
      const orgId = await resolveOrgFromRequest(this.prisma, req);

      const { error, value } = TenantAccessControlResetPasswordSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const existing = await this.prisma.orgMember.findFirst({
        where: { id: idParam, orgId, deletedAt: null },
        select: { id: true, adminId: true },
      });
      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Team member not found.',
        });
      }

      const hashedPassword = await hashPassword(value.password as string);
      await this.prisma.admin.update({
        where: { id: existing.adminId },
        data: { password: hashedPassword, updatedBy: actorAdminId },
      });

      responseSuccess(res, { message: 'Password updated' });
    }),
  ];
}
