"use client";

import { useCallback } from "react";
import { useMessages, useTranslations } from "next-intl";
import {
  getMenuMessageNode,
  resolveMenuTranslation,
} from "./resolveMenuTranslation";

/**
 * Translates dotted paths inside the `menu` namespace (e.g. `menus.overview`,
 * `menu-group.payroll`) without throwing on missing keys.
 *
 *  - When the path resolves to a string in the loaded messages, the translated
 *    value is returned via next-intl (so interpolation / plural rules still work).
 *  - When the path is missing or the value is not a string, the original key
 *    is returned unchanged, instead of next-intl throwing `MISSING_MESSAGE`.
 */
export function useSafeMenuTranslate() {
  const t = useTranslations("menu");
  const messages = useMessages() as Record<string, unknown> | undefined;

  return useCallback(
    (key?: string | null): string => {
      if (!key) return "";

      const menuRoot = (messages?.menu ?? {}) as Record<string, unknown>;
      const resolved = resolveMenuTranslation(menuRoot, key);
      if (resolved === undefined) return key;

      // next-intl only accepts leaf string paths. Branch nodes (e.g.
      // `menus.wifi.billing.subscription` with child `sites` / `changelog`)
      // must use the resolved `$self` label without calling `t(key)`.
      const node = getMenuMessageNode(menuRoot, key);
      if (typeof node !== "string") {
        return resolved;
      }

      try {
        return t(key);
      } catch {
        return resolved;
      }
    },
    [messages, t]
  );
}
