"use client";

import { useRequest } from "ahooks";
import * as MobileAuth from "./query";
import { clearMobileActorCookie } from "./auth-cookie";
import { MOBILE_ROUTES } from "./constants";
import type { MobileActorType } from "./types";

export function useMobileAuth(actor: MobileActorType) {
  const loginPath =
    actor === "collector" ? MOBILE_ROUTES.collector.login : MOBILE_ROUTES.customer.login;

  const profileQuery = useRequest(() => MobileAuth.mobileFetchProfile(actor), {
    refreshDeps: [actor],
  });

  const logoutRequest = useRequest(
    async () => {
      await MobileAuth.mobileLogout(actor);
      clearMobileActorCookie();
      window.location.href = loginPath;
    },
    { manual: true },
  );

  return {
    profile: profileQuery.data,
    loading: profileQuery.loading,
    error: profileQuery.error,
    refreshProfile: profileQuery.refresh,
    logout: logoutRequest.runAsync,
    loggingOut: logoutRequest.loading,
  };
}
