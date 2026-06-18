"use client";

import { usePathname } from "next/navigation";
import MobileShell from "@/features/mobile/shared/components/MobileShell";
import MobileInstallBanner from "@/features/mobile/shared/components/MobileInstallBanner";
import MobilePwaBootstrap from "@/features/mobile/shared/components/MobilePwaBootstrap";
import MobileThemeProvider from "@/features/mobile/shared/components/MobileThemeProvider";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import { useMobileThemeStore } from "@/features/mobile/shared/mobileThemeStore";
import mobileStyles from "@/features/mobile/shared/components/mobile.module.css";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const colorScheme = useMobileThemeStore((s) => s.theme);

  if (pathname === MOBILE_ROUTES.customer.login) {
    return (
      <MobileThemeProvider actor="customer">
        <MobilePwaBootstrap actor="customer" />
        <div className={mobileStyles.loginPage} data-theme={colorScheme} data-actor="customer">
          <div className={mobileStyles.loginPwaWrap}>
            <MobileInstallBanner actor="customer" />
            {children}
          </div>
        </div>
      </MobileThemeProvider>
    );
  }

  return (
    <MobileThemeProvider actor="customer">
      <MobilePwaBootstrap actor="customer" />
      <MobileShell actor="customer">{children}</MobileShell>
    </MobileThemeProvider>
  );
}
