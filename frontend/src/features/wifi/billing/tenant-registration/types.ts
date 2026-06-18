export interface PlatformTierPrice {
  id: string;
  stationSizeId: string;
  unitPrice: string | number;
  currency: string;
  effectiveFrom: string;
}

export interface StationTierPrerequisite {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  platformPrice: PlatformTierPrice | null;
}

export interface RegistrationPrerequisites {
  ready: boolean;
  missing: string[];
  tiers: StationTierPrerequisite[];
}

export interface TierRateOverride {
  stationSizeId: string;
  unitPrice: number;
  currency: string;
}

export interface TenantRegistrationFormValues {
  orgCode: string;
  orgName: string;
  orgDescription?: string;
  timezone: string;
  currency: string;
  stationCodePrefix?: string;
  planCodePrefix?: string;
  resellerCodePrefix?: string;

  stationLimit: number;
  billingCycle: 'MONTHLY';
  effectiveFrom: string;
  expiresAt?: string | null;
  licenseNotes?: string;

  ownerFullName: string;
  ownerUsername: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerPassword: string;
  ownerConfirmPassword: string;

  usePlatformTierRates: boolean;
  tierRateOverrides: TierRateOverride[];
}

export interface TenantRegistrationResult {
  orgId: string;
  orgCode: string;
  orgName: string;
  orgLicenseId: string;
  ownerAdminId: string;
  orgMemberId: string;
}
