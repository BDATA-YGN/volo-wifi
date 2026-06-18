"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  FileText,
  Headphones,
  Home,
  Receipt,
  Satellite,
  User,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import type { MobileActorType, MobileNavItem } from "../types";
import { useMobileThemeStore } from "../mobileThemeStore";
import {
  COLLECTOR_NAV,
  COLLECTOR_SCREEN_TITLES,
  CUSTOMER_NAV,
  CUSTOMER_SCREEN_TITLES,
} from "../nav-config";
import MobileInstallBanner from "./MobileInstallBanner";
import styles from "./mobile.module.css";
import VoloLogo from "./VoloLogo";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  home: Home,
  clipboard: ClipboardList,
  wallet: Wallet,
  receipt: Receipt,
  user: User,
  satellite: Satellite,
  "file-text": FileText,
  bell: Bell,
  headphones: Headphones,
};

function navForActor(actor: MobileActorType): MobileNavItem[] {
  return actor === "collector" ? COLLECTOR_NAV : CUSTOMER_NAV;
}

function isActive(pathname: string, item: MobileNavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function resolveScreenTitle(actor: MobileActorType, pathname: string): string {
  const titles = actor === "collector" ? COLLECTOR_SCREEN_TITLES : CUSTOMER_SCREEN_TITLES;
  const match = Object.entries(titles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  if (match) return match[1];
  return actor === "collector" ? "VOLO Collector" : "StarLink Customer";
}

interface MobileShellProps {
  actor: MobileActorType;
  title?: string;
  children: React.ReactNode;
}

export default function MobileShell({ actor, title, children }: MobileShellProps) {
  const pathname = usePathname();
  const colorScheme = useMobileThemeStore((s) => s.theme);
  const navItems = navForActor(actor);
  const headerTitle = title ?? resolveScreenTitle(actor, pathname);

  return (
    <div className={styles.mobileShell} data-theme={colorScheme} data-actor={actor}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <VoloLogo variant="mark" height={28} title="VOLO" />
          <h1 className={styles.headerTitle}>{headerTitle}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <MobileInstallBanner actor={actor} />
        {children}
      </main>

      <nav className={styles.bottomNav} aria-label="Primary">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(styles.navItem, active && styles.navItemActive)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={styles.navIcon} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
