"use client";

import { useRequest } from "ahooks";
import { useCallback, useState } from "react";
import type {
  CommonListResponse,
  CommonResponse,
  PaginationParams,
} from "@/common/interface/interface";

import { useAdminStore } from "./store";
import * as UseCases from "./query";

export const useAdmin = (params: PaginationParams = { page: 1 }) => {
  const { adminDataList, setAdminDataList, adminData, setAdminData } = useAdminStore();
  const [manualError, setManualError] = useState<string | null>(null);

  const {
    loading: fetchLoading,
    error: fetchError,
    runAsync: callAdmins,
    refreshAsync: refreshAdmins,
  } = useRequest(
    (fetchParams: PaginationParams = params) => UseCases.getAdmins(undefined, fetchParams),
    {
      refreshDeps: [params.page],
      debounceWait: 100,
      onSuccess: (data) => {
        if (Array.isArray(data.data)) {
          setAdminDataList(data as CommonListResponse);
        } else {
          setAdminData(data as CommonResponse);
        }
        setManualError(null);
      },
      onError: (error) => {
        setManualError(error.message || "Failed to fetch admins");
      },
    }
  );

  const {
    loading: fetchSingleLoading,
    error: fetchSingleError,
    runAsync: fetchSingleAdmin,
  } = useRequest(({ id }: { id: string }) => UseCases.getAdmins(id), {
    manual: true,
    onSuccess: (data) => {
      setAdminData(data as CommonResponse);
      setManualError(null);
    },
    onError: (error) => {
      setManualError(error.message || "Failed to fetch admin");
    },
  });

  const {
    loading: createLoading,
    error: createError,
    runAsync: createAdmin,
  } = useRequest(
    ({ payload }: { payload: any }) => UseCases.createAdmin(payload),
    {
      manual: true,
      onSuccess: (data) => {
        setAdminData(data as CommonResponse);
        setManualError(null);
        refreshAdmins();
      },
      onError: (error) => {
        setManualError(error.message || "Failed to create admin");
      },
    }
  );

  const {
    loading: updateLoading,
    error: updateError,
    runAsync: updateAdmin,
  } = useRequest(
    ({ id, payload }: { id: string; payload: any }) => UseCases.updateAdmin(id, payload),
    {
      manual: true,
      onSuccess: (data) => {
        setAdminData(data as CommonResponse);
        setManualError(null);
        refreshAdmins();
      },
      onError: (error) => {
        setManualError(error.message || "Failed to update admin");
      },
    }
  );

  const {
    loading: deleteLoading,
    error: deleteError,
    runAsync: deleteAdmin,
  } = useRequest(({ id }: { id: string }) => UseCases.deleteAdmin(id), {
    manual: true,
    onSuccess: () => {
      setManualError(null);
      refreshAdmins();
    },
    onError: (error) => {
      setManualError(error.message || "Failed to delete admin");
    },
  });

  const loading =
    fetchLoading || fetchSingleLoading || createLoading || updateLoading || deleteLoading;

  const error =
    manualError ||
    fetchError?.message ||
    fetchSingleError?.message ||
    createError?.message ||
    updateError?.message ||
    deleteError?.message;

  const clearError = useCallback(() => {
    setManualError(null);
  }, []);

  return {
    list: adminDataList?.data ?? [],
    single: adminData?.data ?? {},
    fetchAdmins: callAdmins,
    fetchSingleAdmin,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    loading,
    error,
    clearError,
    setAdminDataList,
    setAdminData,
    pagination: {
      currentPage: adminDataList?.meta?.currentPage ?? 1,
      totalPages: adminDataList?.meta?.totalPages ?? 0,
      totalRows: adminDataList?.meta?.totalRows ?? 0,
    },
  };
};
