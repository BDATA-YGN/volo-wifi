export type LicenseStatusFilter = "all" | "ACTIVE" | "SUSPENDED" | "TERMINATED";

export type MobileLicenseStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "TERMINATED";

export type MobileLicenseClass = "A" | "B" | "C" | "PAC" | "UNKNOWN";

export interface MobileLicensePlan {
  id: string;
  name: string;
  starlinkType: string;
  billingCadence: string;
  intervalMonths: number;
  monthlyFee: number;
  currency: string;
}

export interface MobileLicenseKit {
  id: string;
  starlinkType: string;
  kitStatus: string;
  dishSn: string | null;
  kitNumber: string | null;
  routerSn: string | null;
  township: string | null;
  addressLine1: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}

export interface MobileLicense {
  id: string;
  licenseCode: string;
  licenseClass: MobileLicenseClass;
  status: MobileLicenseStatus;
  activatedAt: string | null;
  handedOverAt: string | null;
  paidThroughAt: string | null;
  plan: MobileLicensePlan | null;
  kit: MobileLicenseKit | null;
}

export interface MobileLicenseCertificateData {
  serial: string;
  version: number;
  issuedAt: string;
  token: string;
  qrDataUrl: string;
}

export interface MobileLicenseCertificatePayload {
  license: MobileLicense;
  certificate: MobileLicenseCertificateData;
  issuer: {
    brandName: string;
    brandNameEn: string;
    brandNameMm: string;
    legalName: string;
    contactEmail: string | null;
  };
}
