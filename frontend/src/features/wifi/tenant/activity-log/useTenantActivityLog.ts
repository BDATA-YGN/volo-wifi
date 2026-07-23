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
  canViewAllOrgs: false,
  scopedOrgId: null,
};

export function useTenantActivityLog() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<ActivityLogFormOptions>(emptyFormOptions);
  const [optionsReady, setOptionsReady] = useState(false);

  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    view: "recent",
  } as Partial<ActivityLogListParams>);

  const patchParams = useCallback((patch: Partial<ActivityLogListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const canViewAllOrgs = Boolean(formOptions.canViewAllOrgs);
  const extended = { ...(params as ActivityLogListParams), orgId };

  // Tenants need an org context; developers may load the cross-tenant feed without one.
  const listReady = optionsReady && (canViewAllOrgs || Boolean(orgId));

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.view,
      extended.action,
      extended.entity,
      canViewAllOrgs,
    ],
    ready: listReady,
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as ActivityLogRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as ActivityLogMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as ActivityLogFormOptions;
    setFormOptions(opts);
    setOptionsReady(true);

    // Auto-scope tenants to their only (or primary) membership.
    if (!opts.canViewAllOrgs && !targetOrgId && opts.memberships.length >= 1) {
      const primary = opts.memberships.find((m) => m.isPrimary) ?? opts.memberships[0];
      setOrgId(primary.id);
    }

    // Developers: keep optional filter; if API returned a scoped id from query, sync it.
    if (opts.canViewAllOrgs && opts.scopedOrgId) {
      setOrgId(opts.scopedOrgId);
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

  const clearOrg = useCallback(() => {
    setOrgId(undefined);
    setParams((prev) => ({ ...prev, page: 1 }));
    void loadFormOptions(undefined);
  }, [loadFormOptions, setParams]);

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
    loadEntry,
  };
}
