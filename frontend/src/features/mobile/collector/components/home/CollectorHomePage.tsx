"use client";

import Link from "next/link";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import dayjs from "dayjs";
import {
  ClipboardList,
  FileText,
  Headphones,
  ListChecks,
  MapPin,
  Receipt,
  Wallet,
} from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as CollectionApi from "../../collections/query";
import type { CollectorHomeSummary } from "../../collections/types";
import { formatMmk, formatMmkCompact } from "../../payments/utils";
import * as MobileAuth from "@/features/mobile/shared/query";
import CollectionCard from "../collections/CollectionCard";
import styles from "./home.module.css";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type QuickAccessItem = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  count?: (home: CollectorHomeSummary) => number | null;
  urgent?: (home: CollectorHomeSummary) => boolean;
  hint?: (home: CollectorHomeSummary) => string | null;
};

const QUICK_ACCESS: QuickAccessItem[] = [
  {
    href: MOBILE_ROUTES.collector.collections,
    label: "Collections",
    icon: ClipboardList,
    count: (h) => h.assignedCollectionsToday,
    urgent: (h) => h.overdueCollections > 0,
    hint: (h) => (h.overdueCollections > 0 ? `${h.overdueCollections} overdue` : null),
  },
  {
    href: MOBILE_ROUTES.collector.assignments,
    label: "Assignments",
    icon: ListChecks,
    count: (h) => h.openInvoiceAssignments,
    urgent: (h) => h.openInvoiceAssignments > 0,
  },
  {
    href: MOBILE_ROUTES.collector.payments,
    label: "Payments",
    icon: Wallet,
    count: (h) => h.pendingFinanceConfirmations,
    hint: (h) => (h.pendingFinanceConfirmations > 0 ? "Pending confirm" : null),
  },
  {
    href: MOBILE_ROUTES.collector.support,
    label: "Support",
    icon: Headphones,
    count: (h) => h.myOpenSupportTickets + h.unassignedSupportQueue,
    urgent: (h) => h.unassignedSupportQueue > 0,
    hint: (h) => (h.unassignedSupportQueue > 0 ? `${h.unassignedSupportQueue} unassigned` : null),
  },
  {
    href: MOBILE_ROUTES.collector.expenses,
    label: "Expenses",
    icon: Receipt,
    count: (h) => h.draftExpenses,
    urgent: (h) => h.draftExpenses > 0,
    hint: (h) => (h.draftExpenses > 0 ? "Draft claims" : null),
  },
  {
    href: MOBILE_ROUTES.collector.map,
    label: "Map",
    icon: MapPin,
    count: (h) => h.mapLocationsCount,
  },
  {
    href: MOBILE_ROUTES.collector.content,
    label: "Guides",
    icon: FileText,
  },
];

export default function CollectorHomePage() {
  const now = dayjs();

  const profileQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["profile"]),
    queryFn: () => MobileAuth.mobileFetchCollectorProfile(),
  });

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["home"]),
    queryFn: () => CollectionApi.getCollectorHomeSummary(),
  });

  const todayVisitsQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["home-today-visits"]),
    queryFn: () => CollectionApi.listCollectorCollections({ scope: "today", page: 1, limit: 3 }),
  });

  const isLoading = homeQuery.isLoading;
  const isError = homeQuery.isError;
  const home = homeQuery.data;
  const currency = resolveCurrencyCode(home?.currency);
  const todayVisits = todayVisitsQuery.data?.data ?? [];
  const displayName =
    profileQuery.data?.admin?.fullName?.trim() ||
    profileQuery.data?.admin?.username?.trim() ||
    "Collector";

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading your day…</span>
      </div>
    );
  }

  if (isError || !home) {
    return (
      <div className={styles.errorWrap}>
        Could not load today&apos;s summary.
        <button
          type="button"
          onClick={() => void homeQuery.refetch()}
          className={styles.retryBtn}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Today overview">
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroTop}>
          <div>
            <p className={styles.greeting}>{greetingForHour(now.hour())}</p>
            <h1 className={styles.userName}>{displayName}</h1>
            <p className={styles.dateLine}>{now.format("dddd, D MMM YYYY")}</p>
          </div>
          <span className={styles.heroBadge}>Today</span>
        </div>
        <div className={styles.collectedBlock}>
          <span className={styles.collectedLabel}>Collected today</span>
          <span
            className={styles.collectedValue}
            title={formatMmk(home.collectedAmountToday, currency)}
          >
            {formatMmkCompact(home.collectedAmountToday, currency)}
          </span>
          <span className={styles.collectedSub}>
            {home.assignedCollectionsToday} visit
            {home.assignedCollectionsToday === 1 ? "" : "s"} scheduled
            {home.overdueCollections > 0
              ? ` · ${home.overdueCollections} overdue`
              : ""}
          </span>
        </div>
      </section>

      <section aria-label="Quick access">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Quick access</h2>
        </div>
        <div className={styles.quickGrid}>
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            const count = item.count?.(home);
            const showCount = count != null;
            const isUrgent = item.urgent?.(home) ?? false;
            const hint = item.hint?.(home);

            return (
              <Link key={item.href} href={item.href} className={styles.quickAction}>
                <div className={styles.quickTop}>
                  <span className={styles.quickIcon}>
                    <Icon size={16} aria-hidden />
                  </span>
                  {showCount ? (
                    <span
                      className={`${styles.quickCount} ${count === 0 ? styles.quickCountMuted : ""} ${isUrgent ? styles.quickCountUrgent : ""}`}
                      aria-label={`${count} items`}
                    >
                      {count}
                    </span>
                  ) : null}
                </div>
                <span className={styles.quickLabel}>{item.label}</span>
                {hint ? <span className={styles.quickHint}>{hint}</span> : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-label="Today's collections">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Today&apos;s collections</h2>
          <Link href={MOBILE_ROUTES.collector.collections} className={styles.sectionLink}>
            View all
          </Link>
        </div>

        {todayVisitsQuery.isLoading ? (
          <div className={styles.loadingWrap} style={{ padding: "1.5rem 0" }}>
            <Spin size="small" />
          </div>
        ) : todayVisits.length === 0 ? (
          <div className={styles.emptyVisits}>
            <h3 className={styles.emptyTitle}>No visits scheduled today</h3>
            <p className={styles.emptyDesc}>
              Use quick access above to record payments or review assignments.
            </p>
          </div>
        ) : (
          <div className={styles.visitList}>
            {todayVisits.map((visit) => (
              <CollectionCard key={visit.id} collection={visit} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
