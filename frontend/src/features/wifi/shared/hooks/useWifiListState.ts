"use client";

import { useCallback, useState } from "react";
import type { WifiListParams } from "../types";

const DEFAULT_PARAMS: WifiListParams = {
  page: 1,
  limit: 20,
};

export function useWifiListState(initial: Partial<WifiListParams> = {}) {
  const [params, setParams] = useState<WifiListParams>({ ...DEFAULT_PARAMS, ...initial });

  const setPagination = useCallback((page: number, limit?: number) => {
    setParams((prev) => {
      if (limit !== undefined && limit !== prev.limit) {
        return { ...prev, page: 1, limit };
      }
      return { ...prev, page };
    });
  }, []);

  const setPage = useCallback(
    (page: number) => {
      setPagination(page);
    },
    [setPagination]
  );

  const setSearch = useCallback((search: string) => {
    setParams((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const patchParams = useCallback((patch: Partial<WifiListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  return { params, setParams, setPage, setPagination, setSearch, patchParams };
}
