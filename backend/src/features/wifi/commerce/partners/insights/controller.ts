import { Response } from 'express';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isDeveloperAdmin, loadOrgMembershipOptions } from '@/features/wifi/shared/resolve-org';
import {
  loadResellerPicker,
  resolveCommerceScope,
} from '@/features/wifi/commerce/shared/resolve-commerce-scope';
import { DEFAULT_PRESET, PERIOD_PRESETS, type PeriodPreset } from './constants';
import { CommercePartnersInsightsQuerySchema } from './schema';
import {
  buildPartnerInsights,
  resolvePeriodFromPreset,
  type PartnerInsightsPayload,
} from './build-insights';

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function resolvePeriod(query: AuthenticatedRequest['query']): {
  periodFrom: Date;
  periodTo: Date;
  preset: PeriodPreset | null;
} {
  const presetParam =
    typeof query.preset === 'string' ? query.preset.trim() : '';
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

/** menus.wifi.commerce.partners.insights @route /wifi/commerce/partners/insights */
export class CommercePartnersInsightsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        if (orgIdParam) orgId = orgIdParam;

        const [memberships, resellers] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId ? loadResellerPicker(this.prisma, orgId) : Promise.resolve([]),
        ]);

        const org = orgId
          ? await this.prisma.org.findUnique({
              where: { id: orgId },
              select: { currency: true },
            })
          : null;

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers, currency: org?.currency ?? 'MMK' },
        });
      }

      const { error } = CommercePartnersInsightsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let scope;
      try {
        scope = await resolveCommerceScope(this.prisma, adminId, req.user!, {
          orgId: typeof req.query.orgId === 'string' ? req.query.orgId : undefined,
          resellerId:
            typeof req.query.resellerId === 'string' ? req.query.resellerId : undefined,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'SCOPE_ERROR';
        const message = err instanceof Error ? err.message : 'Unable to resolve partner context.';
        return responseError(res, status, { code, message });
      }

      if ('requiresOrgSelection' in scope) {
        return responseSuccess(res, {
          message: 'Select an organization',
          data: null,
          meta: {
            requiresOrgSelection: true,
            memberships: scope.memberships,
          },
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
            memberships: await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          },
        });
      }

      const resellerId = scope.resellerId;
      if (!resellerId) {
        const resellers = await loadResellerPicker(this.prisma, scope.orgId);
        return responseSuccess(res, {
          message: 'Select a partner',
          data: null,
          meta: {
            requiresResellerSelection: true,
            orgId: scope.orgId,
            resellers,
            memberships: await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          },
        });
      }

      const { periodFrom, periodTo, preset } = resolvePeriod(req.query);

      const [insights, reseller, org] = await Promise.all([
        buildPartnerInsights(this.prisma, scope.orgId, resellerId, periodFrom, periodTo),
        this.prisma.reseller.findFirst({
          where: { id: resellerId, orgId: scope.orgId, deletedAt: null },
          select: { id: true, code: true, name: true, status: true },
        }),
        this.prisma.org.findUnique({
          where: { id: scope.orgId },
          select: { id: true, name: true, currency: true },
        }),
      ]);

      if (!reseller) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Partner not found.',
        });
      }

      const payload: PartnerInsightsPayload & {
        reseller: typeof reseller;
        org: { id: string; name: string; currency: string };
        periodFrom: string;
        periodTo: string;
        preset: PeriodPreset | null;
      } = {
        ...insights,
        reseller,
        org: {
          id: org!.id,
          name: org!.name,
          currency: org!.currency,
        },
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        preset,
      };

      responseSuccess(res, {
        message: 'Success',
        data: payload,
        meta: {
          mode: scope.mode,
          orgId: scope.orgId,
          resellerId,
          preset,
          periodFrom: periodFrom.toISOString(),
          periodTo: periodTo.toISOString(),
          memberships:
            scope.mode === 'org'
              ? await loadOrgMembershipOptions(this.prisma, adminId, isDeveloper)
              : undefined,
          resellers:
            scope.mode === 'org'
              ? await loadResellerPicker(this.prisma, scope.orgId)
              : undefined,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Partner insights are read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Partner insights are read-only.',
      });
    }),
  ];
}
