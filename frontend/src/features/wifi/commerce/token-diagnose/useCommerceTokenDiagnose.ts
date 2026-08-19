"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type { DiagnoseFormOptions, DiagnoseMeta, DiagnoseResult } from "./types";

export function useCommerceTokenDiagnose() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<DiagnoseFormOptions>({ memberships: [] });

  const { data, loading, error, refresh } = useRequest(
    () => {
      if (!submittedCode) return Promise.resolve(null);
      return Query.diagnose({ code: submittedCode, orgId });
    },
    {
      refreshDeps: [submittedCode, orgId],
      ready: Boolean(submittedCode),
    }
  );

  const result = (data?.data ?? null) as DiagnoseResult | null;
  const meta = (data?.meta ?? {}) as DiagnoseMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as DiagnoseFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const runDiagnose = useCallback((nextCode: string) => {
    const trimmed = nextCode.trim().toUpperCase();
    setCode(trimmed);
    setSubmittedCode(trimmed || undefined);
  }, []);

  return {
    code,
    setCode,
    submittedCode,
    runDiagnose,
    result,
    meta,
    loading,
    error,
    orgId,
    selectOrg,
    formOptions,
    loadFormOptions,
    refresh,
  };
}
