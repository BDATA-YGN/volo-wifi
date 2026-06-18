"use client";

import { LoggedUser, LoginInput, LoginResponse } from "@/features/core/auth/types";
import * as AuthUseCase from "@/features/core/auth/query";
import { useAuthStore } from "@/features/core/auth/store";
import { useRequest } from "ahooks";
import { useState } from "react";
import { clearClientCookies } from "@/utils/clientUtils";
import { clearPersistedClientState } from "@/lib/cacheKeys";
import { applySessionMenus, clearSessionCaches } from "@/lib/sessionCache";

const extraRolesAndMenus = async (authData: LoggedUser) => {
  if (!authData?.mapRoleSettings) return {};

  const roleMenuMapping: Record<
    string,
    { visibility: boolean; access: boolean }
  > = {};

  authData.mapRoleSettings.forEach(({ settingKey, enable, visibility }) => {
    roleMenuMapping[settingKey] = {
      visibility,
      access: enable,
    };
  });

  return roleMenuMapping;
};

export const useLoginUser = () => {
  const { authData, setAuthData, setAge } = useAuthStore();

  // manage custom error state
  const [customError, setCustomError] = useState<any>(null);
  const setError = (msg: any) => setCustomError(msg || null);

  /** --- Login --- */
  const {
    runAsync: login,
    loading: loginLoading,
    error: loginError,
  } = useRequest(
    async (email: string, password: string): Promise<LoginResponse> => {
      clearSessionCaches();

      const payload: LoginInput = {
        username: email,
        password,
      };
      const result = await AuthUseCase.login(payload);
      if (!result.success) {
        // Throw on the client so lockout metadata (status, details) is preserved.
        throw result.error;
      }
      setAge(result.data.data.maxAge);
      return result.data;
    },
    {
      manual: true,
      onError: (err) => setCustomError(err),
    }
  );

  /** --- Fetch Me --- */
  const {
    runAsync: fetchMe,
    loading: meLoading,
    error: meError,
  } = useRequest(
    async (): Promise<any> => {
      const data = (await AuthUseCase.fetchLoggedUser()) as LoggedUser;
      setAuthData(data);
      const roleMenuMapping = await extraRolesAndMenus(data);
      applySessionMenus(roleMenuMapping);
      return {
        loggedUser: data,
        menus: roleMenuMapping,
      };
    },
    {
      manual: true,
      onError: (err) => setCustomError(err),
    }
  );
  
  const clearAll = () => {
      clearSessionCaches();
      clearPersistedClientState();
      clearClientCookies();
      window.location.href = "/signin";
  };

  /** --- Sign Out --- */
  const {
    runAsync: signOut,
    loading: signOutLoading,
    error: signOutError,
  } = useRequest(
    async (): Promise<void> => {
      try {
        // Call backend logout endpoint which should clear HTTP-only cookies
        await AuthUseCase.logout();
        clearAll();
        // Client-side cookies (non HTTP-only) still need to be removed manually
        // HTTP-only cookies can only be cleared by the backend setting an expired cookie
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    {
      manual: true,
      onError: (err) => setCustomError(err),
    }
  );

  /** --- ReAuthenticate --- */
  const {
    runAsync: reAuthenticate,
    loading: reAuthLoading,
    error: reAuthError,
  } = useRequest(
    async (): Promise<void> => {
      const data = (await AuthUseCase.refreshToken()) as LoginResponse;
      setAge(data.data.maxAge);
    },
    {
      manual: true,
      onError: (err) => setCustomError(err),
    }
  );

  return {
    authData,

    login,
    fetchMe,
    signOut,
    reAuthenticate,

    loading: loginLoading || meLoading || signOutLoading || reAuthLoading,
    error: customError || loginError || meError || signOutError || reAuthError,

    setError,
  };
};
