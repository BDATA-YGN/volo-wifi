"use client";

import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";

export default function CustomerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MobileGeneralError actor="customer" onRetry={reset} />;
}
