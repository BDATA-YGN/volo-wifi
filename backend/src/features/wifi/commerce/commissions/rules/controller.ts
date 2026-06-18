import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { commissionRuleScopeTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { COMMISSION_TYPES, type CommissionType } from './constants';
import {
  CommerceCommissionsRulesCreateSchema,
  CommerceCommissionsRulesUpdateSchema,
} from './schema';

const ruleSelect = {
  id: true,
  orgId: true,
  resellerId: true,
  planId: true,
  type: true,
  value: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  reseller: {
    select: { id: true, code: true, name: true, status: true },
  },
  plan: {
    select: { id: true, code: true, name: true, quotaType: true, isActive: true },
  },
} satisfies Prisma.CommissionRuleSelect;

type RuleRow = Prisma.CommissionRuleGetPayload<{ select: typeof ruleSelect }>;

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
    throw Object.assign(new Error('Select an organization to manage commission rules.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function serializeRule(row: RuleRow) {
  const value = decimalToNumber(row.value);
  return {
    id: row.id,
    orgId: row.orgId,
    resellerId: row.resellerId,
    planId: row.planId,
    type: row.type,
    value,
    valuePercent: row.type === 'PERCENT' ? Math.round(value * 10000) / 100 : null,
    isActive: row.isActive,
    scopeLabel: buildScopeLabel(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reseller: row.reseller,
    plan: row.plan,
  };
}

function buildScopeLabel(row: {
  reseller: { code: string } | null;
  plan: { code: string } | null;
}): string {
  if (row.reseller && row.plan) {
    return `${row.reseller.code} · ${row.plan.code}`;
  }
  if (row.reseller) return `Partner ${row.reseller.code} (all plans)`;
  if (row.plan) return `Plan ${row.plan.code} (all partners)`;
  return 'Tenant default (all partners & plans)';
}

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.CommissionRuleWhereInput {
  const where: Prisma.CommissionRuleWhereInput = { orgId, deletedAt: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const type = typeof query.type === 'string' ? query.type.trim().toUpperCase() : '';
  const resellerId = typeof query.resellerId === 'string' ? query.resellerId.trim() : '';
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const isActive = typeof query.isActive === 'string' ? query.isActive.trim() : '';

  if (type && (COMMISSION_TYPES as readonly string[]).includes(type)) {
    where.type = type as CommissionType;
  }
  if (resellerId) where.resellerId = resellerId;
  if (planId) where.planId = planId;
  if (isActive === 'true') where.isActive = true;
  if (isActive === 'false') where.isActive = false;

  if (search) {
    where.OR = [
      { reseller: { code: { contains: search, mode: 'insensitive' } } },
      { reseller: { name: { contains: search, mode: 'insensitive' } } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function validateScopeRefs(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string | null | undefined,
  planId: string | null | undefined
): Promise<string | null> {
  if (resellerId) {
    const reseller = await prisma.reseller.findFirst({
      where: { id: resellerId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!reseller) return 'Selected partner is invalid for this tenant.';
  }
  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!plan) return 'Selected plan is invalid for this tenant.';
  }
  return null;
}

async function findDuplicateRule(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string | null,
  planId: string | null,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.commissionRule.findFirst({
    where: {
      orgId,
      deletedAt: null,
      resellerId,
      planId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/** menus.wifi.commerce.commissions.rules @route /wifi/commerce/commissions/rules */
export class CommerceCommissionsRulesController {
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
        if (orgIdParam) {
          orgId = orgIdParam;
        } else {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const [memberships, resellers, plans] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          orgId
            ? this.prisma.reseller.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, status: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
          orgId
            ? this.prisma.plan.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, code: true, name: true, quotaType: true, isActive: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        const org = orgId
          ? await this.prisma.org.findUnique({
              where: { id: orgId },
              select: { currency: true },
            })
          : null;

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, resellers, plans, currency: org?.currency ?? 'MMK' },
        });
      }

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ORG_REQUIRED';
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, status, { code, message });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const row = await this.prisma.commissionRule.findFirst({
          where: { id, orgId, deletedAt: null },
          select: ruleSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Commission rule not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: serializeRule(row) });
      }

      const where = buildListWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, activeCount, percentCount, fixedCount, defaultCount, memberships] =
        await Promise.all([
          this.prisma.commissionRule.findMany({
            where,
            select: ruleSelect,
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
            skip,
            take,
          }),
          this.prisma.commissionRule.count({ where }),
          this.prisma.commissionRule.count({
            where: { orgId, deletedAt: null, isActive: true },
          }),
          this.prisma.commissionRule.count({
            where: { orgId, deletedAt: null, type: 'PERCENT' },
          }),
          this.prisma.commissionRule.count({
            where: { orgId, deletedAt: null, type: 'FIXED' },
          }),
          this.prisma.commissionRule.count({
            where: { orgId, deletedAt: null, resellerId: null, planId: null },
          }),
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeRule),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
          percentCount,
          fixedCount,
          defaultCount,
          memberships,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const { error, value } = (isUpdate
        ? CommerceCommissionsRulesUpdateSchema
        : CommerceCommissionsRulesCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const resellerId =
        value.resellerId !== undefined ? value.resellerId ?? null : undefined;
      const planId = value.planId !== undefined ? value.planId ?? null : undefined;

      if (isUpdate) {
        const existing = await this.prisma.commissionRule.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: { id: true, resellerId: true, planId: true, type: true },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Commission rule not found.',
          });
        }

        const nextResellerId =
          resellerId !== undefined ? resellerId : existing.resellerId;
        const nextPlanId = planId !== undefined ? planId : existing.planId;

        const scopeError = await validateScopeRefs(
          this.prisma,
          orgId,
          nextResellerId,
          nextPlanId
        );
        if (scopeError) {
          return responseError(res, 400, { code: 'VALIDATION_ERROR', message: scopeError });
        }

        const isDuplicate = await findDuplicateRule(
          this.prisma,
          orgId,
          nextResellerId,
          nextPlanId,
          existing.id
        );
        if (isDuplicate) {
          return responseError(res, 409, {
            code: 'RULE_EXISTS',
            message: commissionRuleScopeTakenMessage(),
          });
        }

        const updated = await this.prisma.commissionRule.update({
          where: { id: existing.id },
          data: {
            ...(resellerId !== undefined ? { resellerId } : {}),
            ...(planId !== undefined ? { planId } : {}),
            ...(value.type !== undefined ? { type: value.type } : {}),
            ...(value.value !== undefined ? { value: value.value } : {}),
            ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
          },
          select: ruleSelect,
        });

        return responseSuccess(res, {
          message: 'Commission rule updated',
          data: serializeRule(updated),
        });
      }

      const nextResellerId = value.resellerId ?? null;
      const nextPlanId = value.planId ?? null;

      const scopeError = await validateScopeRefs(
        this.prisma,
        orgId,
        nextResellerId,
        nextPlanId
      );
      if (scopeError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: scopeError });
      }

      const isDuplicate = await findDuplicateRule(
        this.prisma,
        orgId,
        nextResellerId,
        nextPlanId
      );
      if (isDuplicate) {
        return responseError(res, 409, {
          code: 'RULE_EXISTS',
          message: commissionRuleScopeTakenMessage(),
        });
      }

      const created = await this.prisma.commissionRule.create({
        data: {
          orgId,
          resellerId: nextResellerId,
          planId: nextPlanId,
          type: value.type ?? 'PERCENT',
          value: value.value,
          isActive: value.isActive ?? true,
        },
        select: ruleSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Commission rule created',
        data: serializeRule(created),
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const existing = await this.prisma.commissionRule.findFirst({
        where: { id, orgId, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Commission rule not found.',
        });
      }

      await this.prisma.commissionRule.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      responseSuccess(res, { message: 'Commission rule removed', data: { id } });
    }),
  ];
}
