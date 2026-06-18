export type MemberStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export type MemberRoleCode =
  | "ORG_VIEWER"
  | "ORG_FINANCE"
  | "STATION_OPS"
  | "ORG_ADMIN"
  | "PARTNER";

export type ProvisionMemberRoleCode = Exclude<MemberRoleCode, "PARTNER">;

export type OrgMembershipOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
};

export type StationOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type MemberAdmin = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  isBlocked: boolean;
  lastLogin: string | null;
};

export type MemberRole = {
  id: string;
  roleCode: string;
  scopeKey: string;
  stationId: string | null;
  resellerId: string | null;
  isActive: boolean;
  effectiveFrom: string | null;
};

export type MemberStationScope = {
  id: string;
  stationId: string;
  station: StationOption;
};

export type OrgMemberRecord = {
  id: string;
  orgId: string;
  adminId: string;
  status: MemberStatus;
  isPrimary: boolean;
  title: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  admin: MemberAdmin;
  roles: MemberRole[];
  stationScopes: MemberStationScope[];
};

export type AccessControlFormOptions = {
  memberships: OrgMembershipOption[];
  stations: StationOption[];
  resellers: { id: string; code: string; name: string; status: string }[];
  roleCodes: ProvisionMemberRoleCode[];
};

export type AccessControlMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  suspendedCount?: number;
  roleAssignments?: number;
  memberships?: OrgMembershipOption[];
  canSwitchOrg?: boolean;
};

export type AccessControlListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  status?: MemberStatus;
};

export type MemberCreateFormValues = {
  fullName?: string;
  username: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  phoneNumber?: string;
  title?: string;
  status: MemberStatus;
  isPrimary: boolean;
  roleCodes: ProvisionMemberRoleCode[];
  stationIds: string[];
};

export type MemberUpdateFormValues = {
  title?: string;
  status?: MemberStatus;
  isPrimary?: boolean;
  roleCodes?: ProvisionMemberRoleCode[];
  stationIds?: string[];
};
