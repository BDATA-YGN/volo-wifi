"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  CollectorHomeSummary,
  CollectionScopeFilter,
  MobileCollectionRecord,
  RecordCollectionOutcomePayload,
} from "./types";

export interface CollectionListResult {
  data: MobileCollectionRecord[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalRows: number;
  };
}

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function getCollectorHomeSummary(): Promise<CollectorHomeSummary> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.home);
  return unwrapEnvelope<CollectorHomeSummary>(res);
}

export async function listCollectorCollections(params?: {
  scope?: CollectionScopeFilter;
  page?: number;
  limit?: number;
}): Promise<CollectionListResult> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    scope: params?.scope ?? "all",
  };

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.collections, { params: query });
  return unwrapEnvelope<CollectionListResult>(res);
}

export async function getCollectorCollection(id: string): Promise<MobileCollectionRecord> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.collectionDetail(id));
  return unwrapEnvelope<MobileCollectionRecord>(res);
}

export async function recordCollectorCollectionOutcome(
  id: string,
  payload: RecordCollectionOutcomePayload,
): Promise<MobileCollectionRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.collectionResult(id), {
    ...payload,
    visitedAt: payload.visitedAt ?? new Date().toISOString(),
    collectedAmount: payload.collectedAmount ?? 0,
    note: payload.note ?? null,
    referenceNo: payload.referenceNo ?? null,
  });
  return unwrapEnvelope<MobileCollectionRecord>(res);
}

export type CollectionActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: MobileCollectionRecord;
};

export async function safeRecordCollectorCollectionOutcome(
  id: string,
  payload: RecordCollectionOutcomePayload,
): Promise<CollectionActionResult> {
  try {
    const data = await recordCollectorCollectionOutcome(id, payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
