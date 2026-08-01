"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  PartnerDetail,
  PartnerFormValues,
  PartnerRecord,
  PartnersFormOptions,
  PartnersListParams,
  PartnersMeta,
} from "./types";

const emptyFormOptions: PartnersFormOptions = {
  memberships: [],
  stations: [],
  plans: [],
  existingCodes: [],
};

export function useCommercePartners() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<PartnersFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<PartnersListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as PartnersListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.status,
      extended.stationId,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as PartnerRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as PartnersMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as PartnersFormOptions;
    setFormOptions(opts);
    // Without orgId the API returns empty stations/plans — hydrate when there is a single membership.
    if (!targetOrgId && opts.memberships.length === 1) {
      const onlyOrgId = opts.memberships[0].id;
      setOrgId(onlyOrgId);
      const withOrg = await Query.loadFormOptions(onlyOrgId);
      const hydrated = withOrg.data as PartnersFormOptions;
      setFormOptions(hydrated);
      return hydrated;
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

  const loadPartner = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as PartnerDetail;
    },
    [orgId]
  );

  const createPartner = useCallback(
    async (payload: PartnerFormValues) => {
      await Query.create(payload, orgId);
      refresh();
      if (orgId) {
        await loadFormOptions(orgId);
      }
    },
    [orgId, refresh, loadFormOptions]
  );

  const updatePartner = useCallback(
    async (id: string, payload: Partial<PartnerFormValues>) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removePartner = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const resetPartnerPassword = useCallback(
    async (id: string, password: string) => {
      await Query.resetPassword(id, password, orgId);
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
    loadPartner,
    createPartner,
    updatePartner,
    removePartner,
    resetPartnerPassword,
  };
}
