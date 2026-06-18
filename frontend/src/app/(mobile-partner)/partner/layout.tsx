"use client";

import { usePathname } from "next/navigation";
import MobilePwaBootstrap from "@/features/mobile/shared/components/MobilePwaBootstrap";
import MobileThemeProvider from "@/features/mobile/shared/components/MobileThemeProvider";
import MobileInstallBanner from "@/features/mobile/shared/components/MobileInstallBanner";
import { useMobileThemeStore } from "@/features/mobile/shared/mobileThemeStore";
import mobileStyles from "@/features/mobile/shared/components/mobile.module.css";
import { PARTNER_ROUTES } from "@/features/mobile/partner/constants";
import PartnerShell from "@/features/mobile/partner/components/PartnerShell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const colorScheme = useMobileThemeStore((s) => s.theme);

  if (pathname === PARTNER_ROUTES.login) {
    return (
      <MobileThemeProvider actor="partner">
        <MobilePwaBootstrap actor="partner" />
        <div className={mobileStyles.loginPage} data-theme={colorScheme}>
          <div className={mobileStyles.loginPwaWrap}>
            <MobileInstallBanner actor="partner" />
            {children}
          </div>
        </div>
      </MobileThemeProvider>
    );
  }

  return (
    <MobileThemeProvider actor="partner">
      <MobilePwaBootstrap actor="partner" />
      <PartnerShell>{children}</PartnerShell>
    </MobileThemeProvider>
  );
}
