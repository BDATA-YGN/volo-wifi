"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import type { WifiListParams } from "@/features/wifi/shared/types";
import * as Query from "./query";
import type {
  AttributeCatalogMeta,
  AttributeFormValues,
  CatalogAttributeRecord,
  RadiusAttrValueType,
} from "./types";

type ExtendedParams = WifiListParams & { valueType?: RadiusAttrValueType; orgId?: string };

export function useNetworkRadiusAttributeCatalog(initialParams: Partial<ExtendedParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const extended = params as ExtendedParams;

  const listState = useNetworkOrgListState<
    ExtendedParams,
    CatalogAttributeRecord,
    AttributeCatalogMeta
  >(
    extended,
    patchParams,
    Query.list,
    [extended.page, extended.limit, extended.search, extended.valueType]
  );

  const { refresh } = listState;

  const createAttribute = useCallback(
    async (payload: AttributeFormValues) => {
      await Query.create(payload, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  const updateAttribute = useCallback(
    async (id: string, payload: Partial<AttributeFormValues>) => {
      await Query.update(id, payload, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  const deleteAttribute = useCallback(
    async (id: string) => {
      await Query.remove(id, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  return {
    ...listState,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    createAttribute,
    updateAttribute,
    deleteAttribute,
  };
}
