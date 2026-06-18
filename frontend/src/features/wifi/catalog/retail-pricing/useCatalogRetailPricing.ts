"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  PlanPriceFormValues,
  PlanPriceUpdateValues,
  PriceBookDetail,
  PriceBookFormValues,
  PriceBookRecord,
  RetailPricingFormOptions,
  RetailPricingListParams,
  RetailPricingMeta,
} from "./types";

const emptyFormOptions: RetailPricingFormOptions = {
  memberships: [],
  plans: [],
  resellers: [],
  stations: [],
};

export function useCatalogRetailPricing() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<RetailPricingFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<RetailPricingListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as RetailPricingListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.scope,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as PriceBookRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as RetailPricingMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as RetailPricingFormOptions;
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

  const loadBook = useCallback(
    async (id: string) => {
      const res = await Query.getBookById(id, orgId);
      return res.data as PriceBookDetail;
    },
    [orgId]
  );

  const createBook = useCallback(
    async (payload: PriceBookFormValues) => {
      await Query.createBook(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updateBook = useCallback(
    async (id: string, payload: Partial<PriceBookFormValues>) => {
      await Query.updateBook(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removeBook = useCallback(
    async (id: string) => {
      await Query.removeBook(id, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const createPrice = useCallback(
    async (payload: PlanPriceFormValues) => {
      await Query.createPrice(payload, orgId);
    },
    [orgId]
  );

  const updatePrice = useCallback(
    async (id: string, payload: PlanPriceUpdateValues) => {
      await Query.updatePrice(id, payload, orgId);
    },
    [orgId]
  );

  const removePrice = useCallback(
    async (id: string) => {
      await Query.removePrice(id, orgId);
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
    loadBook,
    createBook,
    updateBook,
    removeBook,
    createPrice,
    updatePrice,
    removePrice,
  };
}
