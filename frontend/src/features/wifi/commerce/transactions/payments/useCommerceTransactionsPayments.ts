"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  PaymentDetail,
  PaymentRecord,
  PaymentsFormOptions,
  PaymentsListParams,
  PaymentsMeta,
} from "./types";

const emptyFormOptions: PaymentsFormOptions = {
  memberships: [],
  resellers: [],
  stations: [],
};

export function useCommerceTransactionsPayments() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [resellerFilter, setResellerFilter] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<PaymentsFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<PaymentsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = {
    ...(params as PaymentsListParams),
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
      extended.method,
      extended.stationId,
      extended.orderStatus,
    ],
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as PaymentRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as PaymentsMeta | undefined;

  useEffect(() => {
    if (meta?.orgId && !orgId) {
      setOrgId(meta.orgId);
    }
  }, [meta?.orgId, orgId]);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as PaymentsFormOptions;
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

  const loadPayment = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, { orgId, resellerId: resellerFilter });
      return res.data as PaymentDetail;
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
    loadPayment,
  };
}
