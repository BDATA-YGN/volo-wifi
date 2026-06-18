"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  WorkspaceDashboard,
  WorkspaceFormOptions,
  WorkspaceMeta,
  WorkspaceParams,
} from "./types";

const emptyFormOptions: WorkspaceFormOptions = {
  memberships: [],
  resellers: [],
};

export function useCommercePartnersWorkspace() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<WorkspaceFormOptions>(emptyFormOptions);

  const params: WorkspaceParams = { orgId, resellerId };

  const { data, loading, error, refresh } = useRequest(() => Query.loadDashboard(params), {
    refreshDeps: [orgId, resellerId],
  });

  const dashboard = (data?.data ?? null) as WorkspaceDashboard | null;
  const meta = (data?.meta ?? {}) as WorkspaceMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as WorkspaceFormOptions;
    const bootstrap = (res.meta ?? {}) as WorkspaceMeta;
    setFormOptions(opts);
    if (bootstrap.orgId) {
      setOrgId(bootstrap.orgId);
    } else if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    if (bootstrap.resellerId) {
      setResellerId(bootstrap.resellerId);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setResellerId(undefined);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectReseller = useCallback((id: string) => {
    setResellerId(id);
  }, []);

  return {
    dashboard,
    meta,
    loading,
    error,
    orgId,
    resellerId,
    formOptions,
    selectOrg,
    selectReseller,
    refresh,
    loadFormOptions,
  };
}
