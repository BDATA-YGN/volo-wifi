"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/core/auth/store";
import { usePermissionStore } from "@/features/core/permissions/store";
import { isRouteAccessible } from "@/lib/auth/route-access";

function usePermissionBypass(): boolean {
  const { authData } = useAuthStore();
  const isDeveloper = authData?.role?.roleName?.toLowerCase() === "developer";
  return (
    process.env.NEXT_PUBLIC_BY_PASS === "true" ||
    process.env.BY_PASS === "true" ||
    isDeveloper
  );
}

/** Blocks client navigation to routes the current role cannot access. */
export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissionData } = usePermissionStore();
  const bypass = usePermissionBypass();

  useEffect(() => {
    if (bypass) return;
    if (!permissionData) return;
    if (!isRouteAccessible(pathname, permissionData)) {
      router.replace("/unauthorized");
    }
  }, [bypass, pathname, permissionData, router]);

  return children;
}
