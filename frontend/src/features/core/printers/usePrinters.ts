"use client";
import * as UseCases from "./query";
import { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { usePrinterStore } from './store';
import { useState, useCallback} from "react";
import { useRequest } from 'ahooks';

export const usePrinters = (params: PaginationParams = { page: 1 }) => {
  const { printerDataList, setPrinterDataList, printerData, setPrinterData} = usePrinterStore();
  const [manualError, setManualError] = useState<string | null>(null);

   const {
       data: printerDataResponse,
       loading: fetchLoading,
       error: fetchError,
       runAsync: callPrinters,
       refreshAsync: refreshPrinters,
     } = useRequest(
       (fetchParams: PaginationParams = params) => UseCases.getPrinters(undefined, fetchParams),
       {
         refreshDeps: [params.page], // Re-run when page changes
         debounceWait: 100, // Prevent rapid re-fetching
         onSuccess: (data) => {
           if (Array.isArray(data.data)) {
             setPrinterDataList(data as CommonListResponse); // Sync Zustand store for list
           } else {
             setPrinterData(data as CommonResponse); // Sync Zustand store for single admin
           }
           setManualError(null); // Clear manual error on success
         },
         onError: (error) => {
           setManualError(error.message || 'Failed to fetch users');
         },
       }
     );

     // Fetch single admin by ID
       const {
         loading: fetchSingleLoading,
         error: fetchSingleError,
         runAsync: fetchSinglePrinter,
       } = useRequest(
         ({ id }: { id: string }) => UseCases.getPrinters(id),
         {
           manual: true,
           onSuccess: (data) => {
             setPrinterData(data as CommonResponse); // Sync Zustand store for single user
             setManualError(null); // Clear manual error
           },
           onError: (error) => {
             setManualError(error.message || 'Failed to fetch user');
           },
         }
       );

       // Create user
         const {
           loading: createLoading,
           error: createError,
           runAsync: createPrinter,
         } = useRequest(
          
           ({ payload }: { payload: any }) => {
            console.log("Payload",payload);
            return UseCases.createPrinter(payload);
           },
           {
                manual: true,
              onSuccess: (data) => {
               setPrinterData(data as CommonResponse); // Sync Zustand store
               setManualError(null); // Clear manual error
               refreshPrinters(); // Refresh list with current params
             },
             
             onError: (error) => {
               setManualError(error.message || 'Failed to create user');
             },
           }
         );
         
     
         // Update admin
           const {
             loading: updateLoading,
             error: updateError,
             runAsync: updatePrinter,
           } = useRequest(
             ({ id, payload }: { id: string; payload: any }) => UseCases.updatePrinter(id, payload),
             {
               manual: true,
               onSuccess: (data) => {
                 setPrinterData(data as CommonResponse); // Sync Zustand store
                 setManualError(null); // Clear manual error
                 refreshPrinters(); // Refresh list with current params
               },
               onError: (error) => {
                 setManualError(error.message || 'Failed to update user');
               },
             }
           );

           // Delete admin
             const {
                 loading: deleteLoading,
                 error: deleteError,
                 runAsync: deletePrinter,
               } = useRequest(
                 ({ id }: { id: string }) => UseCases.deletePrinter(id),
                 {
                   manual: true,
                   onSuccess: () => {
                     setManualError(null); // Clear manual error
                     refreshPrinters(); // Refresh list with current params
                   },
                   onError: (error) => {
                     setManualError(error.message || 'Failed to delete admin');
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
    list: printerDataList?.data ?? [],
    single: printerData?.data ?? {},
    fetchPrinters: callPrinters,
    fetchSinglePrinter,
    createPrinter,
    updatePrinter,
    deletePrinter,
    loading,
    error,
    clearError,
    setPrinterDataList,
    setPrinterData,
    pagination: {
      currentPage: printerDataList?.meta?.currentPage ?? 1,
      totalPages: printerDataList?.meta?.totalPages ?? 0,
      totalRows: printerDataList?.meta?.totalRows ?? 0,
    },
  };
};
