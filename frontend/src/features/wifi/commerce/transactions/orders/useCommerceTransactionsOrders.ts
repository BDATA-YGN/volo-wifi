"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  OrderDetail,
  OrderRecord,
  OrdersFormOptions,
  OrdersListParams,
  OrdersMeta,
} from "./types";

const emptyFormOptions: OrdersFormOptions = {
  memberships: [],
  resellers: [],
  stations: [],
};

export function useCommerceTransactionsOrders() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [resellerFilter, setResellerFilter] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<OrdersFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<OrdersListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = {
    ...(params as OrdersListParams),
    orgId,
    resellerId: resellerFilter,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.resellerId,
      extended.status,
      extended.stationId,
    ],
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as OrderRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as OrdersMeta | undefined;

  useEffect(() => {
    if (meta?.orgId && !orgId) {
      setOrgId(meta.orgId);
    }
  }, [meta?.orgId, orgId]);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as OrdersFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setResellerFilter(undefined);
      setParams((prev) => ({ ...prev, page: 1 }));
      void loadFormOptions(id);
    },
    [loadFormOptions, setParams]
  );

  const selectResellerFilter = useCallback(
    (id: string | undefined) => {
      setResellerFilter(id);
      setParams((prev) => ({ ...prev, page: 1 }));
    },
    [setParams]
  );

  const loadOrder = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, { orgId, resellerId: resellerFilter });
      return res.data as OrderDetail;
    },
    [orgId, resellerFilter]
  );

  return {
    list,
    meta,
    loading,
    error,
    params: extended,
    orgId,
    resellerFilter,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    selectResellerFilter,
    refresh,
    loadFormOptions,
    loadOrder,
  };
}
