"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMenuStore } from "@/features/core/menu/menu";
import { setUserLastPath } from "@/utils/clientUtils";
import { navigateFromMenuClick } from "./menuNavigate";

/**
 * Navigate like a sidebar click — updates selected menu + open group.
 */
export function useMenuNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const { setLastMenuClick, setLastMenuGroup } = useMenuStore();

  const navigateToMenu = useCallback(
    (menuKey: string, menuGroupKey = "commerce") => {
      navigateFromMenuClick({
        router,
        pathname,
        menuKey,
        keyPath: [menuKey, menuGroupKey],
        setUserLastPath,
        setLastMenuGroup,
        setLastMenuClick,
      });
    },
    [pathname, router, setLastMenuClick, setLastMenuGroup]
  );

  return { navigateToMenu };
}
