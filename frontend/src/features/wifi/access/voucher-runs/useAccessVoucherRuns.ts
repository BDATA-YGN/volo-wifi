"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  VoucherBatchDetail,
  VoucherBatchRecord,
  VoucherRunFormValues,
  VoucherRunsFormOptions,
  VoucherRunsListParams,
  VoucherRunsMeta,
} from "./types";

const emptyFormOptions: VoucherRunsFormOptions = {
  memberships: [],
  plans: [],
  stations: [],
  stationSizes: [],
};

function defaultDateRange(): Pick<VoucherRunsListParams, "dateFrom" | "dateTo"> {
  return {
    dateFrom: dayjs().subtract(90, "day").format("YYYY-MM-DD"),
    dateTo: dayjs().format("YYYY-MM-DD"),
  };
}

export function useAccessVoucherRuns() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<VoucherRunsFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    ...defaultDateRange(),
  } as Parameters<typeof useWifiListState>[0]);
  const patchParams = useCallback((patch: Partial<VoucherRunsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as VoucherRunsListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.planId,
      extended.stationId,
      extended.township,
      extended.stationSizeId,
      extended.dateFrom,
      extended.dateTo,
      extended.hasBalance,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as VoucherBatchRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as VoucherRunsMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as VoucherRunsFormOptions;
    setFormOptions({
      ...opts,
      stationSizes: opts.stationSizes ?? [],
    });
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

  const loadRun = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as VoucherBatchDetail;
    },
    [orgId]
  );

  const createRun = useCallback(
    async (payload: VoucherRunFormValues) => {
      await Query.create(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const cancelRun = useCallback(
    async (id: string) => {
      await Query.cancel(id, orgId);
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
    loadRun,
    createRun,
    cancelRun,
  };
}
