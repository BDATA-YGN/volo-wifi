"use client";

import { useEffect } from "react";
import { useAppSettingStore } from "./store";

/**
 * Loads `app_settings` into the global Zustand store exactly once.
 * Call this from a top-level layout / provider so any component can read
 * settings synchronously afterwards:
 *
 *   import { useAppSettingStore } from "@/features/system/app-setting/store";
 *   const currencySymbol = useAppSettingStore((s) => s.get("currency_symbol"));
 */
export function useGlobalAppSettings() {
  const { loaded, loading, fetchAll } = useAppSettingStore();

  useEffect(() => {
    if (!loaded && !loading) void fetchAll();
  }, [loaded, loading, fetchAll]);

  return { loaded, loading };
}
