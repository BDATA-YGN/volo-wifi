"use server";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { TRANSLATIONS_API_ROUTES } from "./constant";

const getTranslationByLocale = async (locale: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(TRANSLATIONS_API_ROUTES.getTranslationsByLocale(locale));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createOrUpdateTranslationByLocale = async (locale: string, payload: any): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(TRANSLATIONS_API_ROUTES.createOrUpdateTranslationByLocale(locale), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getLocalLanguages = async (): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(TRANSLATIONS_API_ROUTES.getLocalLanguages());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


export {
  getTranslationByLocale,
  createOrUpdateTranslationByLocale,
  getLocalLanguages,
};