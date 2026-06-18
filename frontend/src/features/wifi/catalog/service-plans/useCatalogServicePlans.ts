"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  ServicePlanFormValues,
  ServicePlanRecord,
  ServicePlansFormOptions,
  ServicePlansListParams,
  ServicePlansMeta,
} from "./types";

const emptyFormOptions: ServicePlansFormOptions = {
  memberships: [],
  quotaTypes: [],
  timeUnits: [],
  timeUsageModes: [],
};

export function useCatalogServicePlans() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<ServicePlansFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<ServicePlansListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as ServicePlansListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.quotaType,
      extended.isActive,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as ServicePlanRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as ServicePlansMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as ServicePlansFormOptions;
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

  const loadPlan = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as ServicePlanRecord;
    },
    [orgId]
  );

  const createPlan = useCallback(
    async (payload: ServicePlanFormValues) => {
      await Query.create(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updatePlan = useCallback(
    async (id: string, payload: Partial<ServicePlanFormValues>) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removePlan = useCallback(
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
    loadPlan,
    createPlan,
    updatePlan,
    removePlan,
  };
}
