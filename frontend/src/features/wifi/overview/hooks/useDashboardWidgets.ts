"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/core/auth/store";
import { usePermissionStore } from "@/features/core/permissions/store";
import { normalizeMemberRoleCode } from "@/features/wifi/tenant/access-control/constant";
import { DASHBOARD_WIDGETS } from "../constant";
import type { DashboardWidgetDefinition } from "../types";

type PermissionEntry = {
  visibility?: boolean;
  access?: boolean;
};

type PermissionMap = Record<string, PermissionEntry> | null;

export type VisibleWidget = DashboardWidgetDefinition & {
  highlighted: boolean;
};

function routePathFromHref(href: string): string {
  return href.split("?")[0].split("#")[0];
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

function canAccessRoute(permissions: PermissionMap, bypass: boolean, route: string): boolean {
  if (bypass) return true;
  const entry = permissions?.[routePathFromHref(route)];
  return Boolean(entry?.visibility && entry?.access);
}

export function useDashboardWidgets(persona: string, orgRoleCodes: string[]): VisibleWidget[] {
  const { permissionData } = usePermissionStore();
  const permissions = permissionData as PermissionMap;
  const bypass = usePermissionBypass();

  return useMemo(() => {
    const roles = new Set<string>([persona, ...orgRoleCodes]);
    for (const code of [persona, ...orgRoleCodes]) {
      const normalized = normalizeMemberRoleCode(code);
      if (normalized) roles.add(normalized);
    }

    return DASHBOARD_WIDGETS.filter((widget) =>
      widget.routes.some((route) => canAccessRoute(permissions, bypass, route))
    )
      .map((widget) => ({
        ...widget,
        highlighted: widget.personas.some((p) => roles.has(p)),
      }))
      .sort((a, b) => Number(b.highlighted) - Number(a.highlighted));
  }, [bypass, orgRoleCodes, permissions, persona]);
}
