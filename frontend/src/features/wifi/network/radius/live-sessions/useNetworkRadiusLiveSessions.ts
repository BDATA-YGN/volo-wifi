"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { filterBySiteAllowList, sessionStationAllowList } from "@/features/wifi/shared/site-allow-list";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import * as Query from "./query";
import { AUTO_REFRESH_MS } from "./constant";
import type {
  LiveSessionRecord,
  LiveSessionsFormOptions,
  LiveSessionsListParams,
  LiveSessionsMeta,
} from "./types";

export function useNetworkRadiusLiveSessions(
  initialParams: Partial<LiveSessionsListParams> = {},
  options?: { autoRefresh?: boolean }
) {
  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    view: "active",
    ...initialParams,
  });

  const patchParams = useCallback((patch: Partial<LiveSessionsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = params as LiveSessionsListParams;

  const listState = useNetworkOrgListState<
    LiveSessionsListParams,
    LiveSessionRecord,
    LiveSessionsMeta
  >(
    extended,
    patchParams,
    Query.list,
    [
      extended.page,
      extended.limit,
      extended.search,
      extended.stationId,
      extended.status,
      extended.view,
      extended.startedFrom,
      extended.startedTo,
    ],
    {
      pollingInterval: options?.autoRefresh ? AUTO_REFRESH_MS : undefined,
      pollingWhenHidden: false,
    }
  );

  const { orgId } = listState;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const scopedOrgId = targetOrgId ?? orgId;
    const res = await Query.loadFormOptions(scopedOrgId);
    const opts = res.data as LiveSessionsFormOptions;
    return {
      ...opts,
      stations: filterBySiteAllowList(
        opts.stations ?? [],
        sessionStationAllowList(scopedOrgId)
      ),
    };
  }, [orgId]);

  const loadSession = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as LiveSessionRecord;
    },
    [orgId]
  );

  return {
    ...listState,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    loadFormOptions,
    loadSession,
  };
}
