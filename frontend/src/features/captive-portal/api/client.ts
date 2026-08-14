import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { CAPTIVE_API_PREFIX } from "../constants";
import { captiveAuthPath } from "../subdomain";
import { loadStoredNasParams } from "../utils/nas-params";
import type {
  CaptiveApiError,
  CaptiveApiSuccess,
  CaptiveDashboardData,
  CaptiveLoginPayload,
  CaptivePlanOption,
  NasParams,
} from "./types";

const baseURL =
  process.env.NEXT_PUBLIC_CAPTIVE_API_URL?.replace(/\/$/, "") || CAPTIVE_API_PREFIX;

export const captiveApiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

captiveApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  const nasParams = loadStoredNasParams();
  if (!nasParams) return config;

  const mac =
    nasParams.mac ??
    nasParams.usermac ??
    nasParams.user_mac ??
    nasParams.client_mac;
  if (mac) {
    config.headers.set("x-calling-station-id", mac);
  }

  const nasIp = nasParams.nas_ip ?? nasParams.nasip ?? nasParams.nasIp;
  if (nasIp) {
    config.headers.set("x-called-station-id", nasIp);
  }

  return config;
});

captiveApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<CaptiveApiError>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      const authPath = captiveAuthPath(window.location.host);
      const isAuthPage = path === authPath || path.startsWith(`${authPath}/`);
      if (!isAuthPage) {
        window.location.href = authPath;
      }
    }
    return Promise.reject(error);
  },
);

export class CaptiveClientError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CaptiveClientError";
    this.code = code;
  }
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<CaptiveApiError>;
  const message =
    axiosError.response?.data?.error?.message ??
    (error instanceof Error ? error.message : "တောင်းဆိုမှု မအောင်မြင်ပါ");

  // Backend NotFoundMiddleware — usually CAPTIVE_API_URL pointing at console
  // without /api captive mounts, or API app not running.
  if (message === "Route not found" || axiosError.response?.status === 404) {
    return "Portal API route မတွေ့ပါ — server CAPTIVE_API_URL (…/api) နှင့် backend API deploy ကို စစ်ပါ။";
  }

  return message;
}

function getErrorCode(error: unknown): string | undefined {
  const axiosError = error as AxiosError<CaptiveApiError>;
  return axiosError.response?.data?.error?.code;
}

export async function captiveLogin(payload: CaptiveLoginPayload): Promise<void> {
  try {
    await captiveApiClient.post<CaptiveApiSuccess<{ ok: boolean }>>("/login", payload);
  } catch (error) {
    throw new CaptiveClientError(getErrorMessage(error), getErrorCode(error));
  }
}

export async function captiveLogout(): Promise<void> {
  try {
    await captiveApiClient.post("/logout");
  } catch {
    // Best-effort logout; cookies may already be cleared.
  }
}

export async function captiveCheckServer(): Promise<boolean> {
  try {
    const { data } = await captiveApiClient.get<CaptiveApiSuccess<{ status: string }>>(
      "/check/server",
    );
    return data.data?.status === "ok";
  } catch {
    return false;
  }
}

export async function captiveGetDashboard(): Promise<CaptiveDashboardData | null> {
  try {
    const { data } = await captiveApiClient.get<CaptiveApiSuccess<CaptiveDashboardData | null>>(
      "/dashboard",
    );
    return data.data ?? null;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function captiveGetSession(): Promise<{
  username: string;
  nasParams: NasParams;
} | null> {
  try {
    const { data } = await captiveApiClient.get<
      CaptiveApiSuccess<{ username: string; nasParams: NasParams } | null>
    >("/session");
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function captiveGetPlans(): Promise<CaptivePlanOption[]> {
  try {
    const { data } = await captiveApiClient.get<CaptiveApiSuccess<CaptivePlanOption[]>>(
      "/dashboard/plans",
    );
    return data.data ?? [];
  } catch {
    return [];
  }
}
