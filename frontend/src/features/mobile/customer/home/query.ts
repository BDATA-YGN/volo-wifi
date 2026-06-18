"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { CustomerHomeSummary } from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function getCustomerHomeSummary(): Promise<CustomerHomeSummary> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.home);
  return unwrapEnvelope<CustomerHomeSummary>(res);
}
