"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import {
  deriveWifiOrgScope,
  useSyncOrgIdFromMeta,
} from "@/features/wifi/shared/hooks/useWifiOrgScope";
import type { WifiOrgScopeMeta } from "@/features/wifi/shared/types";

type ListOptions = {
  pollingInterval?: number;
  pollingWhenHidden?: boolean;
};

export function useNetworkOrgListState<
  TParams extends { orgId?: string; page?: number },
  TRecord,
  TMeta extends WifiOrgScopeMeta,
>(
  params: TParams,
  patchParams: (patch: Partial<TParams>) => void,
  listFn: (params: TParams) => Promise<CommonListResponse>,
  refreshDeps: unknown[],
  options?: ListOptions
) {
  const [orgId, setOrgId] = useState<string | undefined>();
  const extended = { ...params, orgId } as TParams;

  const { data, loading, error, refresh } = useRequest(() => listFn(extended), {
    refreshDeps: [...refreshDeps, orgId],
    pollingInterval: options?.pollingInterval,
    pollingWhenHidden: options?.pollingWhenHidden,
  });

  const meta = (data as CommonListResponse | undefined)?.meta as (TMeta & WifiOrgScopeMeta) | undefined;
  useSyncOrgIdFromMeta(meta, orgId, setOrgId);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      patchParams({ page: 1 } as Partial<TParams>);
    },
    [patchParams]
  );

  return {
    list: ((data as CommonListResponse | undefined)?.data ?? []) as TRecord[],
    meta,
    loading,
    error,
    refresh,
    orgId,
    selectOrg,
    params: extended,
    ...deriveWifiOrgScope(meta, orgId),
  };
}
