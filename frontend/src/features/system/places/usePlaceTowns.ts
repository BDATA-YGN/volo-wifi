"use client";

import { useMemo } from "react";
import { useRequest } from "ahooks";
import { useClientMounted } from "@/common/hooks/useClientMounted";
import type { CommonResponse } from "@/common/interface/interface";
import { getPlaceTowns } from "./query";

const CACHE_MS = 5 * 60 * 1000;

export type PlaceTownOption = { value: string; label: string };

export function usePlaceTowns(region?: string) {
  const mounted = useClientMounted();
  const { data, loading } = useRequest(
    () => getPlaceTowns(region ? { region } : undefined),
    {
      ready: mounted,
      cacheKey: region ? `place-towns-${region}` : "place-towns",
      staleTime: CACHE_MS,
    },
  );

  const towns = (data as CommonResponse<string[]> | undefined)?.data ?? [];

  const options = useMemo<PlaceTownOption[]>(
    () => towns.map((town) => ({ value: town, label: town })),
    [towns],
  );

  return { towns, options, loading };
}
