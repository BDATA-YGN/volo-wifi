"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  ActivityLogFormOptions,
  ActivityLogListParams,
  ActivityLogMeta,
  ActivityLogRecord,
} from "./types";

const emptyFormOptions: ActivityLogFormOptions = {
  memberships: [],
  actions: [],
  entities: [],
};

export function useTenantActivityLog() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<ActivityLogFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    view: "recent",
  } as Partial<ActivityLogListParams>);

  const patchParams = useCallback((patch: Partial<ActivityLogListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as ActivityLogListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.view,
      extended.action,
      extended.entity,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as ActivityLogRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as ActivityLogMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as ActivityLogFormOptions;
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

  const loadEntry = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as ActivityLogRecord;
    },
    [orgId]
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
    loadEntry,
  };
}
