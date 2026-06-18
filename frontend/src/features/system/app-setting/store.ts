import { create } from "zustand";
import * as UseCases from "./query";
import type { AppSettingAttributes } from "./interface";

interface AppSettingStoreState {
  /** All settings keyed by `key` for O(1) lookup. */
  settings: Record<string, AppSettingAttributes>;
  /** Flat list kept in sync with `settings`. */
  list: AppSettingAttributes[];
  /** Whether the initial fetch has completed. */
  loaded: boolean;
  loading: boolean;

  /** Fetch all settings (no category filter) and populate the store. */
  fetchAll: () => Promise<void>;

  /** Get a setting's raw value by key (or `undefined` when missing). */
  get: (key: string) => string | undefined;
  /** Get a setting's value parsed as a number, with optional fallback. */
  getNumber: (key: string, fallback?: number) => number;
  /** Get a setting's value parsed as a boolean. */
  getBool: (key: string) => boolean;
  /** Get a setting's value parsed as JSON. */
  getJSON: <T = unknown>(key: string, fallback?: T) => T;
}

export const useAppSettingStore = create<AppSettingStoreState>((set, getState) => ({
  settings: {},
  list: [],
  loaded: false,
  loading: false,

  fetchAll: async () => {
    if (getState().loading) return;
    set({ loading: true });
    try {
      const res = await UseCases.getAppSettings({ limit: 500 });
      const items = (res?.data ?? []) as AppSettingAttributes[];
      const map: Record<string, AppSettingAttributes> = {};
      for (const item of items) map[item.key] = item;
      set({ settings: map, list: items, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  get: (key: string) => getState().settings[key]?.value,

  getNumber: (key: string, fallback = 0) => {
    const v = getState().settings[key]?.value;
    if (v === undefined || v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },

  getBool: (key: string) => {
    const v = getState().settings[key]?.value;
    return v === "true" || v === "1";
  },

  getJSON: <T = unknown>(key: string, fallback?: T): T => {
    const v = getState().settings[key]?.value;
    if (v === undefined || v === null) return fallback as T;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback as T;
    }
  },
}));
