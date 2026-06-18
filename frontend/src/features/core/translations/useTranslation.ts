"use client";

import * as UseCase from "./query";
import { getQueryClient } from "@/common/provider/get-query-client";
import { useAsyncHandler } from "@/utils/utils";
import { useTranslationStore } from "./store";

export const useAppTranslations = () => {
  const { messages, setMessages, allContentLanguages, setAllContentLanguages } = useTranslationStore();
  const queryClient = getQueryClient();
  const { loading, error, handleAsync, setError } = useAsyncHandler();

  const getTranslationsByLocale = (locale: string): Promise<any> => {
    return queryClient.fetchQuery({
      queryKey: ["TRANS_LIST", locale],
      queryFn: () =>
        handleAsync(async () => {
          const data: any = await UseCase.getTranslationByLocale(locale);
          const raw = (data?.data?.messages as Record<string, unknown>) ?? {};
          setMessages(raw);
          return data;
        }),
      retry: false,
    });
  };

  const createOrUpdateTranslationByLocale = async (
    locale: string,
    payload: any
  ): Promise<any> => {
    return await handleAsync(() =>
      UseCase.createOrUpdateTranslationByLocale(locale, payload)
    );
  };

  const getLocalLanguages = (): Promise<any> => {
    return queryClient.fetchQuery({
      queryKey: ["FETCHED_LOCAL_LANGUAGES", new Date().getTime()],
      queryFn: () =>
        handleAsync(async () => {
          const data: any = await UseCase.getLocalLanguages();
          setAllContentLanguages(Array.isArray(data?.data) ? data.data : []);
          return data;
        }),
      retry: false,
    });
  };

  return {
    messages,
    allContentLanguages,
    getTranslationsByLocale,
    createOrUpdateTranslationByLocale,
    getLocalLanguages,
    loading,
    error,
    setError,
  };
}
