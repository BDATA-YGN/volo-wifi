"use server";

import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";

import { PLACES_ROUTES } from "./constant";

export const getPlaceTowns = async (params?: {
  region?: string;
}): Promise<CommonResponse<string[]>> => {
  try {
    const res: AxiosResponse<CommonResponse<string[]>> = await apiClient.get(
      PLACES_ROUTES.towns(),
      { params },
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
