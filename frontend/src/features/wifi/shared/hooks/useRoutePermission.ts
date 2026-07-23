"use client";

import { useMemo, type ReactNode } from "react";
import { useAuthStore } from "@/features/core/auth/store";
import { usePermissionStore } from "@/features/core/permissions/store";

export type RoutePermission = {
  visible: boolean;
  accessible: boolean;
};

type PermissionEntry = {
  visibility?: boolean;
  access?: boolean;
};

type PermissionMap = Record<string, PermissionEntry> | null;

function routePathFromHref(href: string): string {
  const base = href.split("?")[0].split("#")[0];
  return base || href;
}

function usePermissionBypass(): boolean {
  const { authData } = useAuthStore();
  const isDeveloper = authData?.role?.roleName?.toLowerCase() === "developer";
  return (
    process.env.NEXT_PUBLIC_BY_PASS === "true" ||
    process.env.BY_PASS === "true" ||
    isDeveloper
  );
}

/** Menu permission for a console route path (ignores query string). */
export function useRoutePermission(path: string): RoutePermission {
  const { permissionData } = usePermissionStore();
  const permissions = permissionData as PermissionMap;
  const bypass = usePermissionBypass();
  const routePath = routePathFromHref(path);

  return useMemo(() => {
    if (bypass) {
      return { visible: true, accessible: true };
    }

    const entry = permissions?.[routePath];
    return {
      visible: entry?.visibility ?? false,
      accessible: entry?.access ?? false,
    };
  }, [bypass, permissions, routePath]);
}

export type WifiRelatedLink = {
  href: string;
  label: string;
  icon?: ReactNode;
};

/** Related nav links filtered by menu visibility + access permission. */
export function usePermittedRelatedLinks(links: WifiRelatedLink[]): WifiRelatedLink[] {
  const { permissionData } = usePermissionStore();
  const permissions = permissionData as PermissionMap;
  const bypass = usePermissionBypass();

  return useMemo(() => {
    if (bypass) return links;

    return links.filter((link) => {
      const routePath = routePathFromHref(link.href);
      const entry = permissions?.[routePath];
      return Boolean(entry?.visibility && entry?.access);
    });
  }, [bypass, links, permissions]);
}
