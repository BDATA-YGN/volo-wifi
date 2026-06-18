"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { CustomerSupportInfo } from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function getCustomerSupportInfo(): Promise<CustomerSupportInfo> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.support);
  return unwrapEnvelope<CustomerSupportInfo>(res);
}
