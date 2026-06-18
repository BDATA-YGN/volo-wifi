"use server";

import { LoggedUser, LoginInput, LoginResponse, LoginActionResult } from "./types";
import { handleApiError, parseApiError } from "@/common/exceptions/handleApiError";
import { AxiosResponse } from "axios";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import { apiClient, sessionBootstrapApiClient } from "@/lib/restapi/apiClient";
import { AUTH_API_ROUTES } from "./constant";
import { cookies } from "next/headers";

const login = async (data: LoginInput): Promise<LoginActionResult> => {
  try {
    const res = await sessionBootstrapApiClient.post<LoginResponse>(
      AUTH_API_ROUTES.login(data.username, data.password),
      data,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: parseApiError(error) };
  }
};

const logout = async (): Promise<string> => {
  try {
    // 1. Call the backend to invalidate the session/cookies on the server
    const res: any = await apiClient.post<string>(AUTH_API_ROUTES.logout);
    
    // 2. Explicitly clear Next.js cookies
    const cookieStore = await cookies();
    
    // List all cookie names your app uses
    const cookiesToClear = [
      AUTH_COOKIE_NAMES.admin.access,
      AUTH_COOKIE_NAMES.admin.refresh,
      'menus',
      'session_id',
    ]; 
    
    cookiesToClear.forEach(cookieName => {
      cookieStore.delete(cookieName);
    });

    return res.data;
  } catch (error) {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAMES.admin.access);
    cookieStore.delete(AUTH_COOKIE_NAMES.admin.refresh);
    cookieStore.delete("menus");
    throw handleApiError(error);
  }
};

const refreshToken = async (): Promise<any> => {
  try {
    const res: any = await apiClient.get<any>(AUTH_API_ROUTES.refreshToken);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchLoggedUser = async (): Promise<LoggedUser> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(AUTH_API_ROUTES.userDetails);
    return res.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export { login, logout, refreshToken, fetchLoggedUser };