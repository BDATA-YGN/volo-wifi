"use client";

import { useRequest } from 'ahooks';
import { useCallback, useState } from 'react';
import { useReceiptStore } from './store';
import { CommonListResponse, CommonResponse, PaginationParams } from '@/common/interface/interface';
import * as UseCases from './query';
import { ReceiptTemplate } from './types';

export const useReceipt = (params: PaginationParams = { page: 1 }) => {
  const { templates, setTemplates } = useReceiptStore();
  const [manualError, setManualError] = useState<string | null>(null);

  // Fetch team list or single receipt automatically
  const {
    data: teamDataResponse,
    loading: fetchLoading,
    error: fetchError,
    runAsync: callReceipts,
    refreshAsync: refreshReceipts,
  } = useRequest(
    (fetchParams: PaginationParams = params) => UseCases.getReceipts(undefined, fetchParams),
    {
      refreshDeps: [params.page], // Re-run when page changes
      debounceWait: 100, // Prevent rapid re-fetching
      onSuccess: (data) => {
        if (Array.isArray(data.data)) {
          setTemplates(data.data); // Sync Zustand store for list
        } else {
          // setTeamData(data as CommonResponse); // Sync Zustand store for single receipt
        }
        setManualError(null); // Clear manual error on success
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to fetch receipts');
      },
    }
  );

  // Fetch single receipt by ID
  const {
    loading: fetchSingleLoading,
    error: fetchSingleError,
    runAsync: fetchSingleReceipt,
  } = useRequest(
    ({ id }: { id: string }) => UseCases.getReceipts(id),
    {
      manual: true,
      onSuccess: (data) => {
        // setTeamData(data as CommonResponse); // Sync Zustand store for single receipt
        setManualError(null); // Clear manual error
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to fetch receipt');
      },
    }
  );

  // Create
  const {
    loading: createLoading,
    error: createError,
    runAsync: createReceipt,
  } = useRequest(
    ({ payload }: { payload: any }) => UseCases.createReceipt(payload),
    {
      manual: true,
      onSuccess: (data) => {
        // setTeamData(data as CommonResponse); // Sync Zustand store
        setManualError(null); // Clear manual error
        refreshReceipts(); // Refresh list with current params
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to create receipt');
      },
    }
  );

  // Update receipt
  const {
    loading: updateLoading,
    error: updateError,
    runAsync: updateReceipt,
  } = useRequest(
    ({ id, payload }: { id: string; payload: any }) => UseCases.updateReceipt(id, payload),
    {
      manual: true,
      onSuccess: (data) => {
        // setTeamData(data as CommonResponse); // Sync Zustand store
        setManualError(null); // Clear manual error
        refreshReceipts(); // Refresh list with current params
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to update receipt');
      },
    }
  );

  // Delete receipt
  const {
    loading: deleteLoading,
    error: deleteError,
    runAsync: deleteReceipt,
  } = useRequest(
    ({ id }: { id: string }) => UseCases.deleteReceipt(id),
    {
      manual: true,
      onSuccess: () => {
        setManualError(null); // Clear manual error
        refreshReceipts(); // Refresh list with current params
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to delete receipt');
      },
    }
  );

  const {
    loading: testPrintLoading,
    error: testPrintError,
    runAsync: testPrintReceipt,
  } = useRequest(
    ({ payload }: { payload: any }) => UseCases.testPrintReceipt(payload),
    {
      manual: true,
      onSuccess: (data) => {
        // setTeamData(data as CommonResponse); // Sync Zustand store
        setManualError(null); // Clear manual error
      },
      onError: (error) => {
        setManualError(error.message || 'Failed to test print receipt');
      },
    }
  );

  // Combine loading states
  const loading = fetchLoading || fetchSingleLoading || createLoading || updateLoading || deleteLoading;

  // Combine error states with manual error as fallback
  const error = manualError || fetchError?.message || fetchSingleError?.message || createError?.message || updateError?.message || deleteError?.message;

  // Clear error
  const clearError = useCallback(() => {
    setManualError(null);
  }, []);

  return {
    fetchReceipts: callReceipts,
    fetchSingleReceipt,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    loading,
    error,
    clearError,
    testPrintReceipt,
    testPrintLoading,
    testPrintError
  };
};
