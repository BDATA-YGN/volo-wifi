"use client";

import { useCallback } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  SubscriptionDetailPayload,
  SubscriptionMeta,
  SubscriptionRecord,
  SubscriptionUpdateFormValues,
} from "./types";

export function useBillingSubscription(orgId: string | null) {
  const listRequest = useRequest(() => Query.listSubscriptions(), {
    refreshDeps: [],
  });

  const detailRequest = useRequest(
    () => (orgId ? Query.loadSubscription(orgId) : Promise.resolve(null)),
    { refreshDeps: [orgId] }
  );

  const subscriptions = (listRequest.data?.data?.subscriptions ?? []) as SubscriptionRecord[];
  const listMeta = listRequest.data?.meta as SubscriptionMeta | undefined;
  const detail = detailRequest.data?.data as SubscriptionDetailPayload | undefined;

  const refresh = useCallback(() => {
    listRequest.refresh();
    if (orgId) detailRequest.refresh();
  }, [orgId, listRequest, detailRequest]);

  const updateSubscription = useCallback(
    async (licenseId: string, values: Partial<SubscriptionUpdateFormValues>) => {
      await Query.updateSubscription(licenseId, values);
      refresh();
    },
    [refresh]
  );

  return {
    subscriptions,
    listMeta,
    detail,
    loading: listRequest.loading || (Boolean(orgId) && detailRequest.loading),
    listLoading: listRequest.loading,
    detailLoading: detailRequest.loading,
    error: listRequest.error || detailRequest.error,
    refresh,
    updateSubscription,
  };
}
