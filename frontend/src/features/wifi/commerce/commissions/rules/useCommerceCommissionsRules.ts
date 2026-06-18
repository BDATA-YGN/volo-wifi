"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  CommissionRuleFormValues,
  CommissionRuleRecord,
  RulesFormOptions,
  RulesListParams,
  RulesMeta,
} from "./types";

const emptyFormOptions: RulesFormOptions = {
  memberships: [],
  resellers: [],
  plans: [],
  currency: "MMK",
};

export function useCommerceCommissionsRules() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<RulesFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<RulesListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as RulesListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.type,
      extended.resellerId,
      extended.planId,
      extended.isActive,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as CommissionRuleRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as RulesMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as RulesFormOptions;
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

  const loadRule = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as CommissionRuleRecord;
    },
    [orgId]
  );

  const createRule = useCallback(
    async (payload: CommissionRuleFormValues) => {
      await Query.create(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updateRule = useCallback(
    async (id: string, payload: CommissionRuleFormValues) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removeRule = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
    },
    [orgId, refresh]
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
    loadRule,
    createRule,
    updateRule,
    removeRule,
  };
}
