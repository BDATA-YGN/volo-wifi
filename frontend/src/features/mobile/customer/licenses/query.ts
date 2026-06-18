"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  LicenseStatusFilter,
  MobileLicense,
  MobileLicenseCertificatePayload,
} from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCustomerLicenses(params?: {
  page?: number;
  limit?: number;
  status?: LicenseStatusFilter;
}): Promise<{
  data: MobileLicense[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.licenses, {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      status: params?.status ?? "all",
    },
  });
  return unwrapEnvelope<{
    data: MobileLicense[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function getCustomerLicense(id: string): Promise<MobileLicense> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.licenseDetail(id));
  return unwrapEnvelope<MobileLicense>(res);
}

export async function getCustomerLicenseCertificate(
  id: string,
): Promise<MobileLicenseCertificatePayload> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.licenseCertificate(id));
  return unwrapEnvelope<MobileLicenseCertificatePayload>(res);
}
