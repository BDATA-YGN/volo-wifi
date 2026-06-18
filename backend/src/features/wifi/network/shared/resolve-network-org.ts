import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import {
  canSwitchOrgContext,
  hasGlobalOrgAccess,
  loadOrgMembershipOptions,
  OrgMembershipOption,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';

export type NetworkOrgScope =
  | {
      orgId: string;
      memberships: OrgMembershipOption[];
      canSwitchOrg: boolean;
    }
  | {
      requiresOrgSelection: true;
      memberships: OrgMembershipOption[];
      canSwitchOrg: true;
    };

export type NetworkOrgMeta = {
  orgId?: string;
  memberships: OrgMembershipOption[];
  canSwitchOrg: boolean;
  requiresOrgSelection?: boolean;
};

function queryOrgId(query: AuthenticatedRequest['query']): string | undefined {
  const raw = typeof query.orgId === 'string' ? query.orgId.trim() : '';
  return raw || undefined;
}

export async function resolveNetworkOrgScope(
  prisma: PrismaClient,
  adminId: string,
  user: AuthenticatedRequest['user'],
  query: AuthenticatedRequest['query']
): Promise<NetworkOrgScope> {
  const globalAccess = hasGlobalOrgAccess(user!);
  const memberships = await loadOrgMembershipOptions(prisma, adminId, globalAccess);
  const canSwitchOrg = canSwitchOrgContext(user!) && memberships.length > 1;
  const requestedOrgId = queryOrgId(query);

  const resolved = await resolveOrgIdForAdmin(
    prisma,
    adminId,
    user!,
    requestedOrgId
  );

  if ('requiresSelection' in resolved) {
    return { requiresOrgSelection: true, memberships, canSwitchOrg: true };
  }

  return { orgId: resolved.orgId, memberships, canSwitchOrg };
}

export function toNetworkOrgMeta(scope: NetworkOrgScope): NetworkOrgMeta {
  if ('requiresOrgSelection' in scope) {
    return {
      memberships: scope.memberships,
      canSwitchOrg: scope.canSwitchOrg,
      requiresOrgSelection: true,
    };
  }

  return {
    orgId: scope.orgId,
    memberships: scope.memberships,
    canSwitchOrg: scope.canSwitchOrg,
  };
}

export function mergeNetworkOrgMeta(
  scope: NetworkOrgScope,
  meta: Record<string, unknown> = {}
): Record<string, unknown> {
  return { ...meta, ...toNetworkOrgMeta(scope) };
}

export function scopedNetworkFormOrgs(scope: NetworkOrgScope): OrgMembershipOption[] {
  if ('requiresOrgSelection' in scope) {
    return scope.memberships;
  }
  if (scope.canSwitchOrg) {
    return scope.memberships;
  }
  return scope.memberships.filter((membership) => membership.id === scope.orgId);
}

export function assertRecordInOrg(
  recordOrgId: string | null | undefined,
  scopeOrgId: string,
  label = 'Resource'
): void {
  if (!recordOrgId || recordOrgId !== scopeOrgId) {
    throw Object.assign(new Error(`${label} not found for this organization.`), {
      status: 404,
      code: 'NOT_FOUND',
    });
  }
}

export function enforceScopedOrgId(
  scope: NetworkOrgScope,
  requestedOrgId?: string | null
): string {
  if ('requiresOrgSelection' in scope) {
    throw Object.assign(new Error('Select an organization to continue.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }

  if (requestedOrgId && requestedOrgId !== scope.orgId) {
    throw Object.assign(new Error('You cannot modify resources outside the selected organization.'), {
      status: 403,
      code: 'FORBIDDEN_ORG',
    });
  }

  return scope.orgId;
}
