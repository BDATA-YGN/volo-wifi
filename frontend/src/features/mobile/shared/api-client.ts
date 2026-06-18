import axios, { AxiosError, AxiosResponse } from "axios";
import { SMS_MOBILE_ACTOR_HEADER } from "@/lib/auth/cookies";
import { loginPathForAuthApp } from "@/lib/auth/cookies";
import { MOBILE_ROUTES } from "./constants";
import { mobileAppFromPathname } from "./subdomain";
import type { MobileActorType } from "./types";

function resolveLoginRedirect(pathname: string): string {
  return loginPathForAuthApp(pathname);
}

function resolveMobileActor(pathname: string): MobileActorType | null {
  return mobileAppFromPathname(pathname);
}

/** Browser client for mobile v1 APIs (cookie session after login). */
export const mobileBrowserClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

mobileBrowserClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const actor = resolveMobileActor(path);
    if (actor) {
      config.headers[SMS_MOBILE_ACTOR_HEADER] = actor;
    }
  }
  return config;
});

mobileBrowserClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = resolveLoginRedirect(window.location.pathname);
    }
    return Promise.reject(error);
  },
);

export function mobileApiBaseForActor(actor: MobileActorType): string {
  return actor === "collector"
    ? MOBILE_ROUTES.collector.root
    : MOBILE_ROUTES.customer.root;
}

export async function mobileFetch<T>(
  path: string,
  init?: RequestInit & { actor?: MobileActorType },
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const actor =
    init?.actor ??
    (path.includes("/collector/") ? "collector" : path.includes("/customer/") ? "customer" : undefined);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (actor) {
    headers[SMS_MOBILE_ACTOR_HEADER] = actor;
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (json as { message?: string })?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return (json as { data: T }).data;
}
