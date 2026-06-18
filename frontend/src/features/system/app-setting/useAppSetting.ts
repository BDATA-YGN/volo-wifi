"use client";

import { useRequest } from "ahooks";
import { useState } from "react";

import * as UseCases from "./query";
import type { AppSettingAttributes } from "./interface";

export const useAppSetting = (category?: string) => {
  const [list, setList] = useState<AppSettingAttributes[]>([]);
  const [pagination, setPagination] = useState({ totalRows: 0, currentPage: 1 });

  const {
    loading: fetchLoading,
    runAsync: fetchSettings,
    refreshAsync: refreshSettings,
  } = useRequest(
    async (params?: { category?: string; page?: number; limit?: number }) => {
      const res = await UseCases.getAppSettings({ category, ...params });
      if (res?.data) {
        setList(res.data as AppSettingAttributes[]);
        if (res.meta) {
          setPagination({
            totalRows: res.meta.totalRows ?? 0,
            currentPage: res.meta.currentPage ?? 1,
          });
        }
      }
    },
    { manual: true }
  );

  const { loading: saveLoading, runAsync: saveSetting } = useRequest(
    async ({ payload, id }: { payload: Partial<AppSettingAttributes>; id?: string }) => {
      await UseCases.saveAppSetting(payload, id);
      await refreshSettings();
    },
    { manual: true }
  );

  /**
   * Save a single field's value and update ONLY that item in the local list.
   * No full refresh — used by auto-saving controls (e.g. BOOLEAN switch) so
   * unrelated rows are never re-ordered or re-rendered mid-interaction.
   */
  const { loading: patchLoading, runAsync: patchSetting } = useRequest(
    async ({ id, value }: { id: string; value: string }) => {
      await UseCases.saveAppSetting({ value }, id);
      setList((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
    },
    { manual: true }
  );

  const { loading: deleteLoading, runAsync: deleteSetting } = useRequest(
    async (id: string) => {
      await UseCases.deleteAppSetting(id);
      await refreshSettings();
    },
    { manual: true }
  );

  return {
    list,
    pagination,
    loading: fetchLoading || saveLoading || patchLoading || deleteLoading,
    fetchSettings,
    refreshSettings,
    saveSetting,
    patchSetting,
    deleteSetting,
  };
};
