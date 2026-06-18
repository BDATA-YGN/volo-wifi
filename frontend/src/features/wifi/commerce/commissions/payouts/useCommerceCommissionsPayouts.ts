"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  PayoutDetail,
  PayoutFormValues,
  PayoutPreview,
  PayoutRecord,
  PayoutsFormOptions,
  PayoutsListParams,
  PayoutsMeta,
  PayoutStatusUpdate,
} from "./types";
import { payloadFromForm } from "./utils";

const emptyFormOptions: PayoutsFormOptions = {
  memberships: [],
  resellers: [],
  currency: "MMK",
};

export function useCommerceCommissionsPayouts() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<PayoutsFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<PayoutsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as PayoutsListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.status,
      extended.resellerId,
      extended.periodFrom,
      extended.periodTo,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as PayoutRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as PayoutsMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as PayoutsFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setParams((prev) => ({ ...prev, page: 1 }));
      void loadFormOptions(id);
    },
    [loadFormOptions, setParams]
  );

  const loadPayout = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as PayoutDetail;
    },
    [orgId]
  );

  const previewPayout = useCallback(
    async (resellerId: string, periodFrom: string, periodTo: string) => {
      const res = await Query.preview(resellerId, periodFrom, periodTo, orgId);
      return res.data as PayoutPreview;
    },
    [orgId]
  );

  const createPayout = useCallback(
    async (values: PayoutFormValues) => {
      await Query.create(payloadFromForm(values), orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updatePayoutStatus = useCallback(
    async (id: string, payload: PayoutStatusUpdate) => {
      await Query.updateStatus(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removePayout = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  return {
    list,
    meta,
    loading,
    error,
    params: extended,
    orgId,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    refresh,
    loadFormOptions,
    loadPayout,
    previewPayout,
    createPayout,
    updatePayoutStatus,
    removePayout,
  };
}
