"use client";

import { useCallback, useMemo, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { filterBySiteAllowList, sessionStationAllowList } from "@/features/wifi/shared/site-allow-list";
import * as Query from "./query";
import type {
  AccessTokenDetail,
  AccessTokenRecord,
  AccessTokensFormOptions,
  AccessTokensListParams,
  AccessTokensMeta,
  CredentialLifecycleAction,
  IssueTokenFormValues,
  IssueTokenResult,
} from "./types";

const emptyFormOptions: AccessTokensFormOptions = {
  memberships: [],
  resellers: [],
  catalog: null,
};

export function useCommerceAccessTokens() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<AccessTokensFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<AccessTokensListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as AccessTokensListParams), orgId, resellerId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.resellerId,
      extended.status,
      extended.planId,
      extended.stationId,
    ],
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as AccessTokenRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as AccessTokensMeta | undefined;
  const rawCatalog = meta?.catalog ?? formOptions.catalog;
  const catalog = useMemo(() => {
    if (!rawCatalog) return rawCatalog;
    return {
      ...rawCatalog,
      stations: filterBySiteAllowList(
        rawCatalog.stations ?? [],
        sessionStationAllowList(orgId)
      ),
    };
  }, [rawCatalog, orgId]);

  const loadFormOptions = useCallback(async (targetOrgId?: string, targetResellerId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId, targetResellerId);
    const opts = res.data as AccessTokensFormOptions;
    const bootstrap = res.meta as AccessTokensMeta | undefined;
    const scopedOrgId = targetOrgId ?? bootstrap?.orgId ?? opts.memberships[0]?.id;
    const allowedIds = sessionStationAllowList(scopedOrgId);
    setFormOptions({
      ...opts,
      catalog: opts.catalog
        ? {
            ...opts.catalog,
            stations: filterBySiteAllowList(opts.catalog.stations ?? [], allowedIds),
          }
        : null,
    });
    if (bootstrap?.orgId) {
      setOrgId(bootstrap.orgId);
    } else if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    if (bootstrap?.resellerId) {
      setResellerId(bootstrap.resellerId);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setResellerId(undefined);
      setParams((prev) => ({ ...prev, page: 1 }));
      void loadFormOptions(id);
    },
    [loadFormOptions, setParams]
  );

  const selectReseller = useCallback(
    (id: string | null | undefined) => {
      setResellerId(id || undefined);
      setParams((prev) => ({ ...prev, page: 1 }));
      if (orgId) void loadFormOptions(orgId, id || undefined);
    },
    [loadFormOptions, orgId, setParams]
  );

  const loadToken = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, { orgId, resellerId });
      return res.data as AccessTokenDetail;
    },
    [orgId, resellerId]
  );

  const issueTokens = useCallback(
    async (payload: IssueTokenFormValues) => {
      const res = await Query.issue(payload, { orgId, resellerId });
      refresh();
      return res.data as IssueTokenResult;
    },
    [orgId, resellerId, refresh]
  );

  const revokeToken = useCallback(
    async (id: string) => {
      await Query.revoke(id, { orgId, resellerId });
      refresh();
    },
    [orgId, resellerId, refresh]
  );

  const applyTokenAction = useCallback(
    async (id: string, action: CredentialLifecycleAction) => {
      const res = await Query.applyAction(id, action, { orgId, resellerId });
      if (res.meta?.ok === false) {
        throw new Error(res.message?.trim() || "Failed to update token");
      }
      refresh();
      return res.data;
    },
    [orgId, resellerId, refresh]
  );

  const deleteTokenSession = useCallback(
    async (tokenId: string, sessionId: string, source: "hot" | "archive" | "captive") => {
      await Query.deleteSession(tokenId, sessionId, source, { orgId, resellerId });
      refresh();
    },
    [orgId, resellerId, refresh]
  );

  return {
    list,
    meta,
    catalog,
    loading,
    error,
    params: extended,
    orgId,
    resellerId,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    selectReseller,
    refresh,
    loadFormOptions,
    loadToken,
    issueTokens,
    revokeToken,
    applyTokenAction,
    deleteTokenSession,
  };
}
