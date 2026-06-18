"use client";

import type { ReactNode } from "react";
import VoloLogo from "@/features/mobile/shared/components/VoloLogo";
import styles from "../captive-portal.module.css";

interface CaptiveShellProps {
  children: ReactNode;
  wide?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
}

export default function CaptiveShell({
  children,
  wide = false,
  compact = false,
  title = "Volo WiFi",
  subtitle = "Captive portal",
  headerAction,
}: CaptiveShellProps) {
  return (
    <div className={`${styles.shell} ${compact ? styles.shell_compact : ""}`}>
      <div
        className={`${styles.frame} ${wide ? styles.frame_wide : ""} ${compact ? styles.frame_compact : ""}`}
      >
        <header className={`${styles.header} ${compact ? styles.header_compact : ""}`}>
          <div className={styles.brand}>
            <VoloLogo variant="mark" height={40} title="VOLO" />
            <div>
              <h1 className={styles.brandTitle}>{title}</h1>
              <p className={styles.brandSub}>{subtitle}</p>
            </div>
          </div>
          {headerAction}
        </header>
        <main className={`${styles.main} ${compact ? styles.main_compact : ""}`}>{children}</main>
        {!compact ? <footer className={styles.footer}>Powered by Volo WiFi</footer> : null}
      </div>
    </div>
  );
}
