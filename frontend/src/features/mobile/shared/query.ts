"use server";

import {
  collectorApiClient,
  collectorSessionBootstrapApiClient,
  customerApiClient,
  customerSessionBootstrapApiClient,
} from "@/lib/restapi/apiClient";
import { SMS_MOBILE_ACTOR_HEADER } from "@/lib/auth/cookies";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import { MOBILE_API_ROUTES } from "./constants";
import type {
  CollectorProfileData,
  CustomerProfileData,
  MobileActionResult,
  MobileActorType,
  MobileChangePasswordInput,
  MobileLoginActionResult,
  MobileLoginInput,
  MobileProfile,
} from "./types";

function apiForActor(actor: MobileActorType) {
  return actor === "collector" ? collectorApiClient : customerApiClient;
}

function bootstrapApiForActor(actor: MobileActorType) {
  return actor === "collector" ? collectorSessionBootstrapApiClient : customerSessionBootstrapApiClient;
}

async function clearAuthCookiesForActor(actor: MobileActorType) {
  const cookieStore = await cookies();
  const names = AUTH_COOKIE_NAMES[actor];
  cookieStore.delete(names.access);
  cookieStore.delete(names.refresh);
}

export async function mobileLogin(
  data: MobileLoginInput,
  actor: MobileActorType,
): Promise<MobileLoginActionResult> {
  try {
    const res = await bootstrapApiForActor(actor).post(MOBILE_API_ROUTES.login, data, {
      headers: { [SMS_MOBILE_ACTOR_HEADER]: actor },
    });
    return { success: true, data: res.data as MobileLoginActionResult["data"] };
  } catch (error) {
    const apiError = parseApiError(error);
    return {
      success: false,
      error: {
        message: apiError.message,
        status: apiError.code,
        code: apiError.errorCode,
      },
    };
  }
}

export async function mobileLogout(actor: MobileActorType): Promise<void> {
  try {
    await apiForActor(actor).post(MOBILE_API_ROUTES.logout);
  } finally {
    await clearAuthCookiesForActor(actor);
  }
}

export async function mobileFetchProfile(actor: MobileActorType): Promise<MobileProfile> {
  const res = await apiForActor(actor).get<{ data: MobileProfile }>(MOBILE_API_ROUTES.me);
  return (res.data as { data: MobileProfile }).data;
}

export async function mobileFetchCollectorProfile(): Promise<CollectorProfileData> {
  const res = await collectorApiClient.get<{ data: CollectorProfileData }>(
    MOBILE_API_ROUTES.collector.profile,
  );
  return (res.data as { data: CollectorProfileData }).data;
}

export async function mobileFetchCustomerProfile(): Promise<CustomerProfileData> {
  const res = await customerApiClient.get<{ data: CustomerProfileData }>(
    MOBILE_API_ROUTES.customer.profile,
  );
  return (res.data as { data: CustomerProfileData }).data;
}

export async function mobileChangePassword(
  data: MobileChangePasswordInput,
  actor: MobileActorType,
): Promise<MobileActionResult> {
  try {
    await apiForActor(actor).post(MOBILE_API_ROUTES.changePassword, data);
    return { success: true };
  } catch (error) {
    const apiError = parseApiError(error);
    return {
      success: false,
      error: {
        message: apiError.message,
        status: apiError.code,
        code: apiError.errorCode,
      },
    };
  }
}
