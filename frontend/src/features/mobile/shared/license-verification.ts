export type LicenseVerificationResult = {
  valid?: boolean;
  reason?: string;
  certificate?: {
    serial: string;
    issuedAt: string;
  };
  license?: {
    licenseCode: string;
    licenseClass: string;
    status: string;
    customer?: {
      fullName: string;
      township: string | null;
    };
  };
};
