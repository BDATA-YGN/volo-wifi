"use client";

import Link from "next/link";
import { Button } from "antd";
import { Home, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { MOBILE_ROUTES } from "../constants";
import { PARTNER_ROUTES } from "@/features/mobile/partner/constants";
import { useMobileThemeStore } from "../mobileThemeStore";
import type { MobileActorType } from "../types";
import styles from "./mobile.module.css";

interface MobileGeneralErrorProps {
  actor: MobileActorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Full-page layout when the mobile shell/layout is not rendered */
  standalone?: boolean;
}

export default function MobileGeneralError({
  actor,
  title = "Something went wrong",
  message = "We could not load this page. Please try again or return home.",
  onRetry,
  standalone = false,
}: MobileGeneralErrorProps) {
  const theme = useMobileThemeStore((s) => s.theme);
  const homeHref =
    actor === "partner"
      ? PARTNER_ROUTES.home
      : actor === "collector"
        ? MOBILE_ROUTES.collector.home
        : MOBILE_ROUTES.customer.home;
  const appLabel =
    actor === "partner"
      ? "VOLO Partner"
      : actor === "collector"
        ? "VOLO Collector"
        : "StarLink Customer";

  return (
    <div
      className={clsx(styles.generalErrorRoot, standalone && styles.generalErrorStandalone)}
      data-theme={theme}
    >
      <div className={styles.generalErrorCard}>
        <p className={styles.generalErrorEyebrow}>{appLabel}</p>
        <h1 className={styles.generalErrorTitle}>{title}</h1>
        <p className={styles.generalErrorMessage}>{message}</p>

        <div className={styles.generalErrorActions}>
          <Link href={homeHref} className={styles.generalErrorHomeLink}>
            <Button type="primary" size="large" icon={<Home size={18} />} block>
              Go to home
            </Button>
          </Link>
          {onRetry ? (
            <Button
              size="large"
              icon={<RotateCcw size={18} />}
              onClick={onRetry}
              block
            >
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
