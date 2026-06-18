import { Response } from 'express';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import {
  consoleUsernameTakenMessage,
  tenantCodeTakenMessage,
} from '@/features/wifi/shared/conflict-messages';
import { hashPassword } from '@/utils/password';
import { TenantRegistrationSchema } from './schema';

export class TenantRegistrationController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public prerequisites = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      const [stationSizes, platformPrices] = await Promise.all([
        this.prisma.stationSize.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            sortOrder: true,
          },
        }),
        this.prisma.stationLicensePrice.findMany({
          where: { isActive: true, billingCycle: 'MONTHLY' },
          orderBy: { effectiveFrom: 'desc' },
          select: {
            id: true,
            stationSizeId: true,
            unitPrice: true,
            currency: true,
            effectiveFrom: true,
          },
        }),
      ]);

      const latestPriceBySize = new Map<string, (typeof platformPrices)[number]>();
      for (const row of platformPrices) {
        if (!latestPriceBySize.has(row.stationSizeId)) {
          latestPriceBySize.set(row.stationSizeId, row);
        }
      }

      const tiers = stationSizes.map((size) => ({
        ...size,
        platformPrice: latestPriceBySize.get(size.id) ?? null,
      }));

      const missing: string[] = [];
      if (stationSizes.length === 0) missing.push('capacity_tiers');
      const sizesWithoutPrice = tiers.filter((t) => !t.platformPrice);
      if (sizesWithoutPrice.length > 0) missing.push('platform_tier_rates');

      responseSuccess(res, {
        message: 'Success',
        data: {
          ready: missing.length === 0,
          missing,
          tiers,
        },
      });
    }),
  ];

  public register = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { error, value } = TenantRegistrationSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: '400',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const prereq = await this.prisma.stationSize.count({ where: { isActive: true } });
      const priceCount = await this.prisma.stationLicensePrice.count({
        where: { isActive: true, billingCycle: 'MONTHLY' },
      });
      if (prereq === 0 || priceCount === 0) {
        return responseError(res, 409, {
          code: 'PREREQUISITES_NOT_MET',
          message:
            'Platform capacity tiers and monthly tier rates must be configured before tenant registration.',
        });
      }

      const orgCode = value.org.code.trim().toUpperCase();
      const username = value.owner.username.trim();

      const [existingOrg, existingAdmin, orgAdminRole] = await Promise.all([
        this.prisma.org.findFirst({
          where: { code: orgCode, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.admin.findFirst({
          where: { username, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.mngRoles.findFirst({
          where: { roleName: 'ORG_ADMIN', deletedAt: null },
          select: { roleId: true },
        }),
      ]);

      if (existingOrg) {
        return responseError(res, 409, {
          code: 'ORG_CODE_EXISTS',
          message: tenantCodeTakenMessage(orgCode),
        });
      }
      if (existingAdmin) {
        return responseError(res, 409, {
          code: 'USERNAME_EXISTS',
          message: consoleUsernameTakenMessage(username),
        });
      }
      if (!orgAdminRole) {
        return responseError(res, 500, {
          code: 'ROLE_NOT_FOUND',
          message: 'ORG_ADMIN role is not configured. Run role settings seed.',
        });
      }

      const actorAdminId = req.userId as string;
      const hashedPassword = await hashPassword(value.owner.password);
      const effectiveFrom = new Date(value.license.effectiveFrom);
      const expiresAt = value.license.expiresAt ? new Date(value.license.expiresAt) : null;

      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.org.create({
          data: {
            code: orgCode,
            name: value.org.name.trim(),
            description: value.org.description?.trim() || null,
            timezone: value.org.timezone || 'Asia/Yangon',
            currency: value.org.currency || 'MMK',
            stationCodePrefix: value.org.stationCodePrefix ?? '',
            planCodePrefix: value.org.planCodePrefix ?? '',
            resellerCodePrefix: value.org.resellerCodePrefix ?? '',
            isActive: true,
          },
        });

        const license = await tx.orgLicense.create({
          data: {
            orgId: org.id,
            status: 'ACTIVE',
            billingCycle: value.license.billingCycle || 'MONTHLY',
            stationLimit: value.license.stationLimit,
            currency: value.org.currency || 'MMK',
            effectiveFrom,
            expiresAt,
            notes: value.license.notes?.trim() || null,
          },
        });

        const ownerAdmin = await tx.admin.create({
          data: {
            fullName: value.owner.fullName.trim(),
            username,
            email: value.owner.email?.trim() || null,
            phoneNumber: value.owner.phoneNumber?.trim() || null,
            password: hashedPassword,
            roleId: orgAdminRole.roleId,
            isActive: true,
            isVerified: true,
            isBlocked: false,
            createdBy: actorAdminId,
            lastLogin: new Date(),
          },
        });

        await tx.org.update({
          where: { id: org.id },
          data: { adminId: ownerAdmin.id },
        });

        const member = await tx.orgMember.create({
          data: {
            orgId: org.id,
            adminId: ownerAdmin.id,
            status: 'ACTIVE',
            isPrimary: true,
            title: 'Organization Owner',
            createdByAdminId: actorAdminId,
            joinedAt: new Date(),
          },
        });

        await tx.orgMemberRole.create({
          data: {
            orgId: org.id,
            orgMemberId: member.id,
            roleCode: 'ORG_ADMIN',
            scopeKey: '',
            isActive: true,
            effectiveFrom: new Date(),
            assignedByAdminId: actorAdminId,
          },
        });

        if (!value.usePlatformTierRates && value.tierRateOverrides?.length) {
          await tx.orgLicenseStationSizePrice.createMany({
            data: value.tierRateOverrides.map(
              (row: { stationSizeId: string; unitPrice: number; currency?: string }) => ({
                orgId: org.id,
                stationSizeId: row.stationSizeId,
                billingCycle: 'MONTHLY',
                unitPrice: row.unitPrice,
                currency: row.currency || value.org.currency || 'MMK',
                pricingSource: 'ORG_CUSTOM',
                effectiveFrom,
                isActive: true,
              }),
            ),
          });
        }

        await tx.orgLicenseHistory.create({
          data: {
            orgId: org.id,
            licenseId: license.id,
            changeType: 'OTHER',
            newStationLimit: value.license.stationLimit,
            newStatus: 'ACTIVE',
            effectiveFrom,
            reason: 'Initial tenant registration',
            changedByAdminId: actorAdminId,
          },
        });

        await tx.wifiAuditLog.create({
          data: {
            orgId: org.id,
            adminId: actorAdminId,
            action: 'TENANT_REGISTERED',
            entity: 'Org',
            entityId: org.id,
            meta: {
              orgCode,
              stationLimit: value.license.stationLimit,
              ownerAdminId: ownerAdmin.id,
            },
          },
        });

        return {
          orgId: org.id,
          orgCode: org.code,
          orgName: org.name,
          orgLicenseId: license.id,
          ownerAdminId: ownerAdmin.id,
          orgMemberId: member.id,
        };
      });

      responseSuccess(res, {
        message: 'Tenant registered successfully',
        data: result,
      });
    }),
  ];
}
