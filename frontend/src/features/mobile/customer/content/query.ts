"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { ContentTypeFilter, MobileContentPost } from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCustomerContent(params?: {
  page?: number;
  limit?: number;
  type?: ContentTypeFilter;
}): Promise<{
  data: MobileContentPost[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.content, {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      ...(params?.type && params.type !== "all" ? { type: params.type } : {}),
    },
  });
  return unwrapEnvelope<{
    data: MobileContentPost[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function getCustomerContent(id: string): Promise<MobileContentPost> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.contentDetail(id));
  return unwrapEnvelope<MobileContentPost>(res);
}
