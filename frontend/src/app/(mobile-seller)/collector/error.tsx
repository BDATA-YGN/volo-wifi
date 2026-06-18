"use client";

import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";

export default function CollectorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MobileGeneralError actor="collector" onRetry={reset} />;
}
