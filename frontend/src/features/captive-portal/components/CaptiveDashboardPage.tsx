"use client";

import { useRouter } from "next/navigation";
import { useRequest } from "ahooks";
import CaptiveShell from "./CaptiveShell";
import { captiveGetDashboard, captiveLogout } from "../api/client";
import type { CaptiveDashboardData } from "../api/types";
import { captiveAuthPath } from "../subdomain";
import styles from "../captive-portal.module.css";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("my-MM", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function DashboardContent({ data }: { data: CaptiveDashboardData }) {
  const { connectionStatus, user, plan, balance } = data;

  return (
    <div className={styles.dashboardCompact}>
      <section className={styles.cardHero}>
        <p className={styles.heroEyebrow}>ချိတ်ဆက်မှု</p>
        <h2 className={styles.heroTitle}>{user.displayName}</h2>
        <p className={styles.heroMeta}>{connectionStatus.description}</p>
        <div className={styles.heroRow}>
          <span
            className={`${styles.statusPill} ${
              connectionStatus.connected ? styles.statusOnline : styles.statusOffline
            }`}
          >
            <span className={styles.statusDot} aria-hidden />
            {connectionStatus.connected ? "Online" : "Offline"}
          </span>
          {connectionStatus.ipAddress ? (
            <span className={styles.heroPillLight}>{connectionStatus.ipAddress}</span>
          ) : null}
        </div>
      </section>

      <section className={styles.dashboardPlan}>
        <div className={styles.dashboardPlanHeader}>
          <div>
            <p className={styles.statLabel}>Plan</p>
            <p className={styles.dashboardPlanName}>{plan.name}</p>
          </div>
          <span className={styles.dashboardPlanBadge}>{plan.status}</span>
        </div>

        <div className={styles.progressTrack} aria-hidden>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, balance.remainingPercent))}%` }}
          />
        </div>

        <div className={styles.dashboardPlanMeta}>
          {plan.remainingTime ? (
            <span>အချိန်ကျန် — {plan.remainingTime}</span>
          ) : (
            <span>လက်ကျန် {balance.remainingPercent}%</span>
          )}
          {plan.expiresAt ? <span>သက်တမ်းကုန် — {formatDate(plan.expiresAt)}</span> : null}
        </div>
      </section>
    </div>
  );
}

export default function CaptiveDashboardPage() {
  const router = useRouter();

  const { data, loading, error, refresh } = useRequest(
    async () => {
      const dashboard = await captiveGetDashboard();
      if (!dashboard) {
        router.replace(captiveAuthPath(window.location.host));
        return null;
      }
      return dashboard;
    },
    { pollingInterval: 30_000 },
  );

  const { runAsync: logout, loading: loggingOut } = useRequest(
    async () => {
      await captiveLogout();
      router.replace(captiveAuthPath(window.location.host));
    },
    { manual: true },
  );

  const headerAction = (
    <button
      type="button"
      className={styles.ghostBtn}
      onClick={() => logout()}
      disabled={loggingOut}
    >
      {loggingOut ? "ထွက်နေသည်…" : "ထွက်မည်"}
    </button>
  );

  if (loading && !data) {
    return (
      <CaptiveShell compact subtitle="အချက်အလက် ရယူနေပါသည်…" headerAction={headerAction}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} aria-label="Loading" />
        </div>
      </CaptiveShell>
    );
  }

  if (error || !data) {
    return (
      <CaptiveShell compact subtitle="Dashboard" headerAction={headerAction}>
        <div className={styles.errorBanner} role="alert">
          {error instanceof Error ? error.message : "Dashboard မရရှိပါ"}
        </div>
        <button type="button" className={styles.submitBtn} onClick={() => refresh()}>
          ပြန်ကြိုးစားမည်
        </button>
      </CaptiveShell>
    );
  }

  return (
    <CaptiveShell compact subtitle="Dashboard" headerAction={headerAction}>
      <DashboardContent data={data} />
    </CaptiveShell>
  );
}
