"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { MapPin, MobileContentPost } from "../support/types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCollectorContent(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  data: MobileContentPost[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.content, {
    params: { page: params?.page ?? 1, limit: params?.limit ?? 20 },
  });
  return unwrapEnvelope<{
    data: MobileContentPost[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function getCollectorContent(id: string): Promise<MobileContentPost> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.contentDetail(id));
  return unwrapEnvelope<MobileContentPost>(res);
}

export async function listCollectorMapPins(): Promise<MapPin[]> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.map);
  return unwrapEnvelope<MapPin[]>(res);
}
