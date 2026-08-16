"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { filterBySiteAllowList, sessionStationAllowList } from "@/features/wifi/shared/site-allow-list";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import * as Query from "./query";
import { AUTO_REFRESH_MS } from "./constant";
import type {
  AuthEventRecord,
  AuthEventsFormOptions,
  AuthEventsListParams,
  AuthEventsMeta,
} from "./types";

export function useNetworkRadiusAuthEvents(
  initialParams: Partial<AuthEventsListParams> = {},
  options?: { autoRefresh?: boolean }
) {
  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    view: "recent",
    ...initialParams,
  });

  const patchParams = useCallback((patch: Partial<AuthEventsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = params as AuthEventsListParams;

  const listState = useNetworkOrgListState<
    AuthEventsListParams,
    AuthEventRecord,
    AuthEventsMeta
  >(
    extended,
    patchParams,
    Query.list,
    [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.stationId,
      extended.outcome,
      extended.view,
      extended.authFrom,
      extended.authTo,
    ],
    {
      pollingInterval: options?.autoRefresh ? AUTO_REFRESH_MS : undefined,
      pollingWhenHidden: false,
    }
  );

  const { orgId } = listState;

  const loadFormOptions = useCallback(async () => {
    const res = await Query.loadFormOptions(orgId);
    const opts = res.data as AuthEventsFormOptions;
    return {
      ...opts,
      stations: filterBySiteAllowList(
        opts.stations ?? [],
        sessionStationAllowList(orgId)
      ),
    };
  }, [orgId]);

  const loadEvent = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as AuthEventRecord;
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
    loadEvent,
  };
}
