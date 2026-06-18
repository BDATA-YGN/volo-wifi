"use client";

import { usePathname } from "next/navigation";
import { isMobileWebPath } from "@/lib/auth/cookies";
import MobileGeneralError from "@/features/mobile/shared/components/MobileGeneralError";
import MobileThemeProvider from "@/features/mobile/shared/components/MobileThemeProvider";

export default function NotFoundPage() {
  const pathname = usePathname();

  if (isMobileWebPath(pathname)) {
    const actor = pathname.startsWith("/collector") ? "collector" : "customer";
    return (
      <MobileThemeProvider>
        <MobileGeneralError
          actor={actor}
          standalone
          title="Page not found"
          message="This page does not exist. Go back to home to continue."
        />
      </MobileThemeProvider>
    );
  }

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      <h1 className="text-6xl font-extrabold text-orange-600">404</h1>
      <button
        type="button"
        onClick={handleGoHome}
        className="mt-6 px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors"
      >
        Go to Home
      </button>
    </div>
  );
}
