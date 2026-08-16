"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { filterBySiteAllowList, sessionStationAllowList } from "@/features/wifi/shared/site-allow-list";
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
  canViewAllOrgs: false,
  scopedOrgId: null,
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
  const [optionsReady, setOptionsReady] = useState(false);

  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    ...defaultDateRange(),
  } as Parameters<typeof useWifiListState>[0]);
  const patchParams = useCallback((patch: Partial<VoucherRunsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const canViewAllOrgs = Boolean(formOptions.canViewAllOrgs);
  const extended = { ...(params as VoucherRunsListParams), orgId };
  const listReady = optionsReady && (canViewAllOrgs || Boolean(orgId));

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
      canViewAllOrgs,
    ],
    ready: listReady,
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as VoucherBatchRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as VoucherRunsMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as VoucherRunsFormOptions;
    const scopedOrgId = targetOrgId ?? opts.scopedOrgId ?? opts.memberships[0]?.id;
    setFormOptions({
      ...opts,
      stations: filterBySiteAllowList(opts.stations ?? [], sessionStationAllowList(scopedOrgId)),
      stationSizes: opts.stationSizes ?? [],
      canViewAllOrgs: Boolean(opts.canViewAllOrgs),
    });
    setOptionsReady(true);

    // Tenants: auto-scope to sole membership and hydrate catalog (Sites pattern).
    if (!opts.canViewAllOrgs && !targetOrgId && opts.memberships.length === 1) {
      const onlyOrgId = opts.memberships[0].id;
      setOrgId(onlyOrgId);
      const withOrg = await Query.loadFormOptions(onlyOrgId);
      const hydrated = withOrg.data as VoucherRunsFormOptions;
      setFormOptions({
        ...hydrated,
        stations: filterBySiteAllowList(
          hydrated.stations ?? [],
          sessionStationAllowList(onlyOrgId)
        ),
        stationSizes: hydrated.stationSizes ?? [],
        canViewAllOrgs: Boolean(hydrated.canViewAllOrgs),
      });
      return hydrated;
    }

    if (opts.canViewAllOrgs && opts.scopedOrgId) {
      setOrgId(opts.scopedOrgId);
    }

    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setParams((prev) => ({
        ...prev,
        page: 1,
        planId: undefined,
        stationId: undefined,
      }));
      void loadFormOptions(id);
    },
    [loadFormOptions, setParams]
  );

  const clearOrg = useCallback(() => {
    setOrgId(undefined);
    setParams((prev) => ({
      ...prev,
      page: 1,
      planId: undefined,
      stationId: undefined,
    }));
    void loadFormOptions(undefined);
  }, [loadFormOptions, setParams]);

  const loadRun = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as VoucherBatchDetail;
    },
    [orgId]
  );

  const createRun = useCallback(
    async (payload: VoucherRunFormValues) => {
      // When browsing all orgs, derive org from selected site/plan via API hints.
      const stationOrgId = payload.stationId
        ? formOptions.stations.find((s) => s.id === payload.stationId)?.orgId
        : undefined;
      const planOrgId = formOptions.plans.find((p) => p.id === payload.planId)?.orgId;
      const mutateOrgId = orgId ?? stationOrgId ?? planOrgId;
      await Query.create(payload, mutateOrgId);
      refresh();
    },
    [orgId, formOptions.stations, formOptions.plans, refresh]
  );

  const cancelRun = useCallback(
    async (id: string, batchOrgId?: string) => {
      await Query.cancel(id, orgId ?? batchOrgId);
      refresh();
    },
    [orgId, refresh]
  );

  return {
    list,
    meta,
    loading: !optionsReady || loading,
    error,
    params: extended,
    orgId,
    formOptions,
    canViewAllOrgs: Boolean(formOptions.canViewAllOrgs || meta?.canViewAllOrgs),
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    clearOrg,
    refresh,
    loadFormOptions,
    loadRun,
    createRun,
    cancelRun,
  };
}
