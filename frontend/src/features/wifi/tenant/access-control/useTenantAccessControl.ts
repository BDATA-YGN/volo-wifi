"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  AccessControlFormOptions,
  AccessControlListParams,
  AccessControlMeta,
  MemberCreateFormValues,
  MemberUpdateFormValues,
  OrgMemberRecord,
} from "./types";

const emptyFormOptions: AccessControlFormOptions = {
  memberships: [],
  stations: [],
  resellers: [],
  roleCodes: [],
};

export function useTenantAccessControl() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<AccessControlFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<AccessControlListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as AccessControlListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.status,
      extended.roleCode,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as OrgMemberRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as AccessControlMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as AccessControlFormOptions;
    setFormOptions(opts);
    return opts;
  }, []);

  const selectOrg = useCallback((id: string) => {
    setOrgId(id);
    setParams((prev) => ({ ...prev, page: 1 }));
    void loadFormOptions(id);
  }, [loadFormOptions, setParams]);

  const loadMember = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as OrgMemberRecord;
    },
    [orgId]
  );

  const createMember = useCallback(
    async (payload: MemberCreateFormValues) => {
      await Query.create(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updateMember = useCallback(
    async (id: string, payload: MemberUpdateFormValues) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removeMember = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const resetMemberPassword = useCallback(
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
    loadMember,
    createMember,
    updateMember,
    removeMember,
    resetMemberPassword,
  };
}
