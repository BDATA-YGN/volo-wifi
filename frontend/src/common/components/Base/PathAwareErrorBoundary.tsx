"use client";

import { usePathname } from "next/navigation";
import { isMobileWebPath } from "@/lib/auth/cookies";
import ErrorBoundary from "./ErrorBoundary";
import MobileRouteErrorBoundary from "./MobileRouteErrorBoundary";

export default function PathAwareErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isMobileWebPath(pathname)) {
    return <MobileRouteErrorBoundary actor="partner">{children}</MobileRouteErrorBoundary>;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
