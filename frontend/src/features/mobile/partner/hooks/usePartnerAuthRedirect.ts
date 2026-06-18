"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Send partner users back to login when console session cookies are missing or invalid. */
export function usePartnerAuthRedirect(error: unknown) {
  const router = useRouter();

  useEffect(() => {
    if (!error) return;
    const message = String(error);
    const isAuthError =
      message.includes("401") ||
      message.toLowerCase().includes("invalid token") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("please login");
    if (isAuthError) {
      router.replace("/partner/login");
    }
  }, [error, router]);
}
