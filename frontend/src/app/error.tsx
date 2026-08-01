"use client";

import { usePathname } from "next/navigation";
import { isMobileWebPath } from "@/lib/auth/cookies";
import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";
import MobileThemeProvider from "@/features/mobile/shared/components/MobileThemeProvider";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  if (isMobileWebPath(pathname)) {
    return (
      <MobileThemeProvider>
        <MobileGeneralError actor="partner" onRetry={reset} standalone />
      </MobileThemeProvider>
    );
  }

  const handleGoBack = () => {
    window.history.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 text-gray-800 relative overflow-hidden">
      <div className="relative z-10 max-w-lg w-full text-center">
        <h1 className="text-4xl font-black mb-4 text-red-600">Oops!</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-8">
          We apologize for the inconvenience. Please try again or return home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-xl"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
