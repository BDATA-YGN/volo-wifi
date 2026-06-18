import type { OrgMembershipOption } from "@/features/wifi/tenant/profile/types";

export type WifiListParams = {
  page: number;
  limit: number;
  search?: string;
};

export type WifiOrgScopeMeta = {
  orgId?: string;
  memberships?: OrgMembershipOption[];
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};
