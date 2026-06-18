import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  enforceScopedOrgId,
  mergeNetworkOrgMeta,
  resolveNetworkOrgScope,
  scopedNetworkFormOrgs,
  toNetworkOrgMeta,
} from '@/features/wifi/network/shared/resolve-network-org';
import {
  NetworkRadiusPlanPoliciesCreateSchema,
  NetworkRadiusPlanPoliciesUpdateSchema,
} from './schema';

const orgSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.OrgSelect;

const planSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.PlanSelect;

const stationSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
} satisfies Prisma.WifiStationSelect;

const vendorProfileSelect = {
  id: true,
  name: true,
  vendor: true,
  model: true,
} satisfies Prisma.RadiusVendorProfileSelect;

const policySelect = {
  id: true,
  orgId: true,
  planId: true,
  wifiStationId: true,
  vendorProfileId: true,
  phase: true,
  attributeName: true,
  op: true,
  valueType: true,
  value: true,
  priority: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  org: { select: orgSelect },
  plan: { select: planSelect },
  wifiStation: { select: stationSelect },
  vendorProfile: { select: vendorProfileSelect },
} satisfies Prisma.PlanRadiusAttributeSelect;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function buildWhere(
  query: AuthenticatedRequest['query'],
  orgId: string
): Prisma.PlanRadiusAttributeWhereInput {
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const vendorProfileId =
    typeof query.vendorProfileId === 'string' ? query.vendorProfileId.trim() : '';
  const wifiStationId =
    typeof query.wifiStationId === 'string' ? query.wifiStationId.trim() : '';
  const phase = typeof query.phase === 'string' ? query.phase.trim().toUpperCase() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where: Prisma.PlanRadiusAttributeWhereInput = { deletedAt: null, orgId };
  if (planId) where.planId = planId;
  if (vendorProfileId) where.vendorProfileId = vendorProfileId;
  if (wifiStationId) where.wifiStationId = wifiStationId;
  if (query.globalOnly === 'true') where.wifiStationId = null;
  if (phase) where.phase = phase as Prisma.EnumRadiusAttrPhaseFilter['equals'];

  if (search) {
    where.OR = [
      { attributeName: { contains: search, mode: 'insensitive' } },
      { value: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { org: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function validatePolicyRefs(
  prisma: PrismaClient,
  orgId: string,
  planId: string,
  vendorProfileId: string,
  wifiStationId?: string | null
): Promise<string | null> {
  const [plan, vendorProfile, station] = await Promise.all([
    prisma.plan.findFirst({
      where: { id: planId, orgId, deletedAt: null },
      select: { id: true },
    }),
    prisma.radiusVendorProfile.findFirst({
      where: { id: vendorProfileId, orgId, deletedAt: null },
      select: { id: true },
    }),
    wifiStationId
      ? prisma.wifiStation.findFirst({
          where: { id: wifiStationId, orgId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve({ id: wifiStationId }),
  ]);

  if (!plan) return 'Plan not found for this tenant.';
  if (!vendorProfile) return 'Vendor profile not found.';
  if (wifiStationId && !station) return 'WiFi site not found for this tenant.';

  return null;
}

/** menus.wifi.network.radius.plan-policies @route /wifi/network/radius/plan-policies */
export class NetworkRadiusPlanPoliciesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if ('requiresOrgSelection' in scope) {
        if (req.query.formOptions === 'true') {
          return responseSuccess(res, {
            message: 'Success',
            data: {
              orgs: scope.memberships,
              plans: [],
              stations: [],
              vendorProfiles: [],
              catalogAttributes: [],
            },
            meta: toNetworkOrgMeta(scope),
          });
        }

        const { page, limit } = parsePagination(req.query);
        return responseSuccess(res, {
          message: 'Success',
          data: [],
          meta: mergeNetworkOrgMeta(scope, {
            page,
            limit,
            total: 0,
            totalPages: 1,
          }),
        });
      }

      const { orgId } = scope;
      const orgScopeWhere = { deletedAt: null, orgId };

      if (req.query.formOptions === 'true') {
        const [plans, stations, vendorProfiles, catalogAttributes] = await Promise.all([
          this.prisma.plan.findMany({
            where: { orgId, deletedAt: null },
            select: planSelect,
            orderBy: { name: 'asc' },
          }),
          this.prisma.wifiStation.findMany({
            where: { orgId, deletedAt: null },
            select: stationSelect,
            orderBy: { name: 'asc' },
          }),
          this.prisma.radiusVendorProfile.findMany({
            where: { orgId, deletedAt: null },
            select: vendorProfileSelect,
            orderBy: [{ vendor: 'asc' }, { name: 'asc' }],
          }),
          this.prisma.routerSupportedAttribute.findMany({
            where: { orgId },
            select: {
              id: true,
              freeradiusName: true,
              displayName: true,
              op: true,
              valueType: true,
              defaultValue: true,
            },
            orderBy: { freeradiusName: 'asc' },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            orgs: scopedNetworkFormOrgs(scope),
            plans,
            stations,
            vendorProfiles,
            catalogAttributes,
          },
          meta: toNetworkOrgMeta(scope),
        });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const row = await this.prisma.planRadiusAttribute.findFirst({
          where: { id: req.params.id, deletedAt: null, orgId },
          select: policySelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Plan RADIUS policy not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: row,
          meta: toNetworkOrgMeta(scope),
        });
      }

      const where = buildWhere(req.query, orgId);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, phaseGroups, planCount] = await Promise.all([
        this.prisma.planRadiusAttribute.findMany({
          where,
          select: policySelect,
          orderBy: [{ priority: 'asc' }, { attributeName: 'asc' }],
          skip,
          take,
        }),
        this.prisma.planRadiusAttribute.count({ where }),
        this.prisma.planRadiusAttribute.groupBy({
          by: ['phase'],
          where: orgScopeWhere,
          _count: { _all: true },
        }),
        this.prisma.planRadiusAttribute.groupBy({
          by: ['planId'],
          where: orgScopeWhere,
          _count: { _all: true },
        }),
      ]);

      const phaseCounts = Object.fromEntries(
        phaseGroups.map((row) => [row.phase, row._count._all])
      );

      responseSuccess(res, {
        message: 'Success',
        data: rows,
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          phaseCounts,
          plansWithPolicies: planCount.length,
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage plan RADIUS policies.',
        });
      }

      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? NetworkRadiusPlanPoliciesUpdateSchema
        : NetworkRadiusPlanPoliciesCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let scopedOrgId: string;
      try {
        scopedOrgId = enforceScopedOrgId(scope, (value.orgId as string | undefined) ?? null);
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 403, {
          code: e.code ?? 'FORBIDDEN_ORG',
          message: e.message ?? 'Organization scope mismatch.',
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.planRadiusAttribute.findFirst({
          where: { id: recordId!, deletedAt: null, orgId: scope.orgId },
          select: {
            id: true,
            orgId: true,
            planId: true,
            vendorProfileId: true,
            wifiStationId: true,
          },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Plan RADIUS policy not found.',
          });
        }

        const orgId = scopedOrgId;
        const planId = (value.planId as string | undefined) ?? existing.planId;
        const vendorProfileId =
          (value.vendorProfileId as string | undefined) ?? existing.vendorProfileId;
        const wifiStationId =
          value.wifiStationId !== undefined ? value.wifiStationId : existing.wifiStationId;

        const refError = await validatePolicyRefs(
          this.prisma,
          orgId,
          planId,
          vendorProfileId,
          wifiStationId
        );
        if (refError) {
          return responseError(res, 400, { code: 'INVALID_REFS', message: refError });
        }

        const updated = await this.prisma.planRadiusAttribute.update({
          where: { id: recordId! },
          data: {
            orgId,
            ...(value.planId !== undefined ? { planId: value.planId } : {}),
            ...(value.vendorProfileId !== undefined
              ? { vendorProfileId: value.vendorProfileId }
              : {}),
            ...(value.wifiStationId !== undefined
              ? { wifiStationId: value.wifiStationId }
              : {}),
            ...(value.phase !== undefined ? { phase: value.phase } : {}),
            ...(value.attributeName !== undefined ? { attributeName: value.attributeName } : {}),
            ...(value.op !== undefined ? { op: value.op } : {}),
            ...(value.valueType !== undefined ? { valueType: value.valueType } : {}),
            ...(value.value !== undefined ? { value: value.value } : {}),
            ...(value.priority !== undefined ? { priority: value.priority } : {}),
            ...(value.note !== undefined ? { note: value.note?.trim() || null } : {}),
          },
          select: policySelect,
        });

        return responseSuccess(res, {
          message: 'Plan RADIUS policy updated',
          data: updated,
        });
      }

      const refError = await validatePolicyRefs(
        this.prisma,
        scopedOrgId,
        value.planId,
        value.vendorProfileId,
        value.wifiStationId ?? null
      );
      if (refError) {
        return responseError(res, 400, { code: 'INVALID_REFS', message: refError });
      }

      const created = await this.prisma.planRadiusAttribute.create({
        data: {
          orgId: scopedOrgId,
          planId: value.planId,
          vendorProfileId: value.vendorProfileId,
          wifiStationId: value.wifiStationId ?? null,
          phase: value.phase ?? 'REPLY',
          attributeName: value.attributeName,
          op: value.op ?? ':=',
          valueType: value.valueType ?? 'STRING',
          value: value.value,
          priority: value.priority ?? 100,
          note: value.note?.trim() || null,
        },
        select: policySelect,
      });

      responseSuccess(res, {
        message: 'Plan RADIUS policy created',
        data: created,
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage plan RADIUS policies.',
        });
      }

      const id = req.params.id;
      const existing = await this.prisma.planRadiusAttribute.findFirst({
        where: { id, deletedAt: null, orgId: scope.orgId },
        select: { id: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Plan RADIUS policy not found.',
        });
      }

      await this.prisma.planRadiusAttribute.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      responseSuccess(res, { message: 'Plan RADIUS policy removed' });
    }),
  ];
}
