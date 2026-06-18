import { startTransition } from "react";

/**
 * Normalizes pathname / menu keys for comparison (trailing slash, query stripped).
 */
export function normalizePathForMenu(path: string | null | undefined): string {
  if (!path) return "";
  const withoutQuery = path.split("?")[0] ?? "";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

type AppRouterLike = {
  push: (href: string) => void;
  refresh: () => void;
};

/**
 * Navigate from a sidebar / top menu item.
 *
 * Important ordering: trigger `router.push` BEFORE Zustand state updates.
 * The Sidebar subscribes to `lastMenuClick` / `lastMenuGroup`, so updating
 * those first causes the component to re-render while the navigation is still
 * being scheduled, which can cancel the route change on Next 16 + Turbopack
 * (the user sees the menu highlight move but the URL doesn't change until the
 * next click). Pushing first and wrapping state updates in `startTransition`
 * lets the router commit the navigation undisturbed.
 *
 * Re-clicking the already active route runs a soft `router.refresh()` instead
 * of a no-op, so server components refetch and the main scroll area returns
 * to the top.
 */
export function navigateFromMenuClick(params: {
  router: AppRouterLike;
  pathname: string;
  menuKey: string;
  keyPath: readonly string[];
  setUserLastPath: (path: string) => void;
  setLastMenuGroup: (group: string) => void;
  setLastMenuClick: (key: string) => void;
}): void {
  const {
    router,
    pathname,
    menuKey,
    keyPath,
    setUserLastPath,
    setLastMenuGroup,
    setLastMenuClick,
  } = params;

  const current = normalizePathForMenu(pathname);
  const dest = normalizePathForMenu(menuKey);
  const isSameRoute = current === dest;

  // Persist the last path cookie immediately so a refresh after navigation
  // restores the right page; this is not connected to React state.
  setUserLastPath(menuKey);

  if (isSameRoute) {
    router.refresh();
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.querySelector(".content") as HTMLElement | null;
        if (el) el.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  } else {
    router.push(menuKey);
  }

  // Defer non-urgent UI state updates so they don't race with the router.
  startTransition(() => {
    if (keyPath.length > 1) {
      setLastMenuGroup(String(keyPath[1]));
    }
    setLastMenuClick(menuKey);
  });
}
