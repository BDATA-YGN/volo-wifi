"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, KeyRound, User, Wallet } from "lucide-react";
import clsx from "clsx";
import MobileInstallBanner from "@/features/mobile/shared/components/MobileInstallBanner";
import VoloLogo from "@/features/mobile/shared/components/VoloLogo";
import { useMobileThemeStore } from "@/features/mobile/shared/mobileThemeStore";
import mobileStyles from "@/features/mobile/shared/components/mobile.module.css";
import { PARTNER_NAV, PARTNER_SCREEN_TITLES } from "../nav-config";
import type { PartnerNavItem } from "../nav-config";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  home: Home,
  key: KeyRound,
  clipboard: ClipboardList,
  wallet: Wallet,
  user: User,
};

function isActive(pathname: string, item: PartnerNavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function resolveScreenTitle(pathname: string): string {
  const match = Object.entries(PARTNER_SCREEN_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.[1] ?? "Volo Partner";
}

interface PartnerShellProps {
  title?: string;
  children: React.ReactNode;
}

export default function PartnerShell({ title, children }: PartnerShellProps) {
  const pathname = usePathname();
  const colorScheme = useMobileThemeStore((s) => s.theme);
  const headerTitle = title ?? resolveScreenTitle(pathname);

  return (
    <div className={mobileStyles.mobileShell} data-theme={colorScheme} data-actor="partner">
      <header className={mobileStyles.header}>
        <div className={mobileStyles.headerBrand}>
          <VoloLogo variant="mark" height={28} title="VOLO" />
          <h1 className={mobileStyles.headerTitle}>{headerTitle}</h1>
        </div>
      </header>

      <main className={mobileStyles.main}>
        <MobileInstallBanner actor="partner" />
        {children}
      </main>

      <nav className={mobileStyles.bottomNav} aria-label="Primary">
        {PARTNER_NAV.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(mobileStyles.navItem, active && mobileStyles.navItemActive)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={mobileStyles.navIcon} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
