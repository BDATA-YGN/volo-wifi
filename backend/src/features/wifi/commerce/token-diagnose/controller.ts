import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isDeveloperAdmin, loadOrgMembershipOptions } from '@/features/wifi/shared/resolve-org';
import { resolveAllowedStationIds } from '@/features/wifi/shared/resolve-station-scope';
import {
  loadResellerPicker,
  resolveCommerceScope,
} from '@/features/wifi/commerce/shared/resolve-commerce-scope';
import { CommerceTokenDiagnoseQuerySchema } from './schema';
import { diagnoseAccessToken } from './diagnose-token';

/** menus.wifi.commerce.token-diagnose @route /wifi/commerce/token-diagnose */
export class CommerceTokenDiagnoseController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        const orgId = orgIdParam || undefined;
        const allowedStationIds = orgId
          ? await resolveAllowedStationIds(this.prisma, adminId, orgId, req.user!)
          : null;
        const [memberships, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId ? loadResellerPicker(this.prisma, orgId, allowedStationIds) : Promise.resolve([]),
        ]);
        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers },
        });
      }

      const { error } = CommerceTokenDiagnoseQuerySchema.validate(req.query, { abortEarly: false });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
      if (!code) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Enter a token code to diagnose.',
        });
      }

      let scope;
      try {
        scope = await resolveCommerceScope(this.prisma, adminId, req.user!, {
          orgId: typeof req.query.orgId === 'string' ? req.query.orgId : undefined,
          resellerId: typeof req.query.resellerId === 'string' ? req.query.resellerId : undefined,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const message = err instanceof Error ? err.message : 'Unable to resolve organization.';
        return responseError(res, status, { code: 'SCOPE_ERROR', message });
      }

      if ('requiresOrgSelection' in scope) {
        return responseSuccess(res, {
          message: 'Select an organization',
          data: null,
          meta: { requiresOrgSelection: true, memberships: scope.memberships },
        });
      }

      if ('requiresResellerSelection' in scope) {
        return responseSuccess(res, {
          message: 'Select a partner',
          data: null,
          meta: {
            requiresResellerSelection: true,
            orgId: scope.orgId,
            resellers: scope.resellers,
          },
        });
      }

      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        scope.orgId,
        req.user!
      );

      const result = await diagnoseAccessToken(this.prisma, {
        orgId: scope.orgId,
        code,
        resellerId: scope.mode === 'partner' ? scope.resellerId : scope.resellerId,
        allowedStationIds,
      });

      return responseSuccess(res, {
        message: result.found ? 'Diagnosis ready' : 'Token not found',
        data: result,
        meta: {
          mode: scope.mode,
          orgId: scope.orgId,
          resellerId: scope.resellerId ?? null,
          partnerLocked: scope.mode === 'partner',
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Token diagnose is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Token diagnose is read-only.',
      });
    }),
  ];
}
