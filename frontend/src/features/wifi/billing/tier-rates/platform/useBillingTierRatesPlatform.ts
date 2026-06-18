"use client";

import { useCallback } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PlatformRateFormValues,
  PlatformRatesMeta,
  PlatformRatesPayload,
} from "./types";

export function useBillingTierRatesPlatform() {
  const { data, loading, error, refresh } = useRequest(() => Query.loadPlatformRates());

  const payload = data?.data as PlatformRatesPayload | undefined;
  const meta = data?.meta as PlatformRatesMeta | undefined;

  const createRate = useCallback(
    async (values: PlatformRateFormValues) => {
      await Query.create(values);
      refresh();
    },
    [refresh]
  );

  const updateRate = useCallback(
    async (id: string, values: Partial<PlatformRateFormValues>) => {
      await Query.update(id, values);
      refresh();
    },
    [refresh]
  );

  const deleteRate = useCallback(
    async (id: string) => {
      await Query.remove(id);
      refresh();
    },
    [refresh]
  );

  return {
    matrix: payload?.matrix ?? [],
    history: payload?.history ?? [],
    meta,
    loading,
    error,
    refresh,
    createRate,
    updateRate,
    deleteRate,
  };
}
