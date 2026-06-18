"use client";

import { getQueryClient } from "@/common/provider/get-query-client";
import { useAsyncHandler } from "@/utils/utils";
import * as UseCases from "./query";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { PaginationParams } from "@/common/interface/interface";
import { useThemeStore } from "./store";

export const useTheme = () => {
  const queryClient = getQueryClient();

  const { loading, error, handleAsync, setError } = useAsyncHandler();

  const { themes, selectedTheme, setState } = useThemeStore();

  const createTheme = (payload: any): Promise<CommonResponse> => {
    return queryClient.fetchQuery({
      queryKey: ["THEME_CREATE", {}],
      queryFn: () =>
        handleAsync(async () => {
          const data: CommonResponse = (await UseCases.createTheme(payload)) as CommonResponse;
          return data;
        }),
      retry: false,
    });
  };

  const updateTheme = (id: string, payload: any): Promise<CommonResponse> => {
    return queryClient.fetchQuery({
      queryKey: ["THEME_UPDATE", {}],
      queryFn: () =>
        handleAsync(async () => {
          const data: CommonResponse = (await UseCases.updateTheme(id, payload)) as CommonResponse;
          return data;
        }),
      retry: false,
    });
  };

  const deleteTheme = (id: string): Promise<CommonResponse> => {
    return queryClient.fetchQuery({
      queryKey: ["THEME_DELETE", {}],
      queryFn: () =>
        handleAsync(async () => {
          const data: CommonResponse = (await UseCases.deleteTheme(id)) as CommonResponse;
          return data;
        }),
      retry: false,
    });
  };

  const fetchThemes = (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse | CommonResponse> => {
    return queryClient.fetchQuery({
      queryKey: ["THEME_LIST", id, paginationParams],
      queryFn: () =>
        handleAsync(async () => {
          const data = await UseCases.getThemes(id, paginationParams);
          if(Array.isArray(data.data)) {
            setState({ themes: data.data });
          } else {
            setState({ selectedTheme: data.data });
          }
          return data;
        }),
      retry: false,
    });
  };

  return {
    list: themes,
    single: selectedTheme,
    fetchThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    loading,
    error,
    setError
  };
};
