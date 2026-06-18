"use server";

import { AxiosResponse } from "axios";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type {
  CommonListResponse,
  CommonResponse,
} from "@/common/interface/interface";

import { CONVERSATION_ROUTES } from "./constant";
import type {
  AddParticipantsPayload,
  InboxFilter,
  SendMessagePayload,
  StartBroadcastPayload,
  StartDirectPayload,
} from "./interface";

const API = CONVERSATION_ROUTES;

const toAxiosParams = (input: Record<string, unknown> | undefined) => {
  if (!input) return undefined;
  const out: Record<string, unknown> = {};
  Object.entries(input).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  });
  return out;
};

export const getInbox = async (
  filter: InboxFilter = {},
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.inbox(), {
      params: toAxiosParams({ ...filter }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getRecipients = async (
  search?: string,
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.recipients(), {
      params: toAxiosParams({ search }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getConversation = async (
  id: string,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.details(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getMessages = async (
  id: string,
  before?: string,
  limit?: number,
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.messages(id), {
      params: toAxiosParams({ before, limit }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const startDirect = async (
  payload: StartDirectPayload,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(
      API.startDirect(),
      payload,
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const startBroadcast = async (
  payload: StartBroadcastPayload,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(
      API.startBroadcast(),
      payload,
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const sendMessage = async (
  id: string,
  payload: SendMessagePayload,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(
      API.sendMessage(id),
      payload,
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const markRead = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(API.markRead(id), {});
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteConversation = async (
  id: string,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete(API.remove(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getCandidates = async (
  id: string,
  search?: string,
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.candidates(id), {
      params: toAxiosParams({ search }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const addParticipants = async (
  id: string,
  payload: AddParticipantsPayload,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(
      API.addParticipants(id),
      payload,
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const removeParticipant = async (
  id: string,
  adminId: string,
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete(
      API.removeParticipant(id, adminId),
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
