export type MobileActorType = "collector" | "customer" | "partner";

export interface MobileAdminBrief {
  id: string;
  fullName: string;
  username: string;
  email?: string | null;
  phoneNumber?: string | null;
  profileImage?: string | null;
  roleName?: string | null;
}

export interface MobileCustomerBrief {
  id: string;
  fullName: string;
  township?: string | null;
  addressLine1?: string | null;
  organization?: string | null;
}

export interface MobileCustomerContact {
  id: string;
  label?: string | null;
  value: string;
  kind: string;
  isPrimary?: boolean;
}

/** @deprecated Use MobileCustomerContact — kept for older typings */
export interface MobileContact {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

export interface MobileProfile {
  actorType: MobileActorType;
  roleName: string;
  admin: MobileAdminBrief;
  customer?: MobileCustomerBrief;
  contacts?: MobileCustomerContact[];
}

export interface CustomerProfileData {
  admin: MobileAdminBrief;
  customer: MobileCustomerBrief | null;
  contacts: MobileCustomerContact[];
}

export interface MobileLoginInput {
  username: string;
  password: string;
}

export interface MobileLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  profile: MobileProfile;
}

export interface MobileLoginActionResult {
  success: boolean;
  data?: {
    success?: boolean;
    message?: string;
    data: MobileLoginResponse;
  };
  error?: { message?: string; status?: number; code?: string };
}

export interface MobileNavItem {
  href: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix";
}

export interface CollectorProfileData {
  admin: MobileAdminBrief;
}

export interface MobileChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface MobileActionResult {
  success: boolean;
  error?: { message?: string; status?: number; code?: string };
}
