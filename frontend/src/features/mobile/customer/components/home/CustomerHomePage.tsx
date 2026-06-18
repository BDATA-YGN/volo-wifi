"use client";

import Link from "next/link";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import dayjs from "dayjs";
import {
  AlertTriangle,
  Bell,
  FileText,
  Headphones,
  Satellite,
  Wallet,
} from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as MobileAuth from "@/features/mobile/shared/query";
import * as HomeApi from "../../home/query";
import type { CustomerHomeSummary } from "../../home/types";
import { formatInvoiceAmount } from "../../invoices/utils";
import ContentPostCard from "../content/ContentPostCard";
import styles from "./home.module.css";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type QuickAccessItem = {
  href: string;
  label: string;
  icon: typeof Satellite;
  count?: (home: CustomerHomeSummary) => number | null;
  urgent?: (home: CustomerHomeSummary) => boolean;
  hint?: (home: CustomerHomeSummary) => string | null;
};

const QUICK_ACCESS: QuickAccessItem[] = [
  {
    href: MOBILE_ROUTES.customer.invoices,
    label: "Invoices",
    icon: FileText,
    count: (h) => h.unpaidInvoices.count,
    urgent: (h) => h.unpaidInvoices.count > 0,
    hint: (h) =>
      h.unpaidInvoices.count > 0
        ? `${formatInvoiceAmount(h.unpaidInvoices.totalDue, h.unpaidInvoices.currency, true)} due`
        : null,
  },
  {
    href: MOBILE_ROUTES.customer.licenses,
    label: "Licenses",
    icon: Satellite,
    count: (h) => h.activeLicenses,
  },
  {
    href: MOBILE_ROUTES.customer.support,
    label: "Support",
    icon: Headphones,
    count: (h) => h.openSupportTickets,
    urgent: (h) => h.openSupportTickets > 0,
    hint: (h) => (h.openSupportTickets > 0 ? "Open tickets" : null),
  },
  {
    href: MOBILE_ROUTES.customer.payments,
    label: "Payments",
    icon: Wallet,
  },
  {
    href: MOBILE_ROUTES.customer.content,
    label: "Notices",
    icon: Bell,
    count: (h) => h.latestNotices.length,
  },
];

export default function CustomerHomePage() {
  const now = dayjs();

  const profileQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["profile"]),
    queryFn: () => MobileAuth.mobileFetchCustomerProfile(),
  });

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["home"]),
    queryFn: () => HomeApi.getCustomerHomeSummary(),
  });

  const home = homeQuery.data;
  const customer = profileQuery.data?.customer;
  const displayName =
    customer?.fullName?.trim() ||
    profileQuery.data?.admin?.fullName?.trim() ||
    profileQuery.data?.admin?.username?.trim() ||
    "Customer";

  const currency = resolveCurrencyCode(home?.unpaidInvoices.currency);
  const unpaidCount = home?.unpaidInvoices.count ?? 0;
  const unpaidTotal = home?.unpaidInvoices.totalDue ?? 0;
  const notices = home?.latestNotices ?? [];

  if (homeQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading your account…</span>
      </div>
    );
  }

  if (homeQuery.isError || !home) {
    return (
      <div className={styles.errorWrap}>
        Could not load your overview.
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
      <section className={styles.hero} aria-label="Account overview">
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroTop}>
          <div>
            <p className={styles.greeting}>{greetingForHour(now.hour())}</p>
            <h1 className={styles.userName}>{displayName}</h1>
            <p className={styles.dateLine}>{now.format("dddd, D MMM YYYY")}</p>
          </div>
          <span className={styles.heroBadge}>Overview</span>
        </div>
        <div className={styles.outstandingBlock}>
          <span className={styles.outstandingLabel}>Outstanding balance</span>
          <span
            className={styles.outstandingValue}
            title={formatInvoiceAmount(unpaidTotal, currency)}
          >
            {formatInvoiceAmount(unpaidTotal, currency, true)}
          </span>
          <span className={styles.outstandingSub}>
            {unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}
            {home.activeLicenses > 0
              ? ` · ${home.activeLicenses} active license${home.activeLicenses === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
      </section>

      {unpaidCount > 0 ? (
        <Link href={MOBILE_ROUTES.customer.invoices} className={styles.alertBanner}>
          <AlertTriangle size={18} aria-hidden />
          <span>
            <strong>Payment due</strong>
            You have {unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}. Review billing to
            keep your StarLink service active.
          </span>
        </Link>
      ) : null}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIconWrap} aria-hidden>
            <Satellite size={18} />
          </span>
          <span className={styles.statLabel}>Active licenses</span>
          <span className={styles.statValue}>{home.activeLicenses}</span>
          <span className={styles.statSub}>On your account</span>
        </div>
        <div className={`${styles.statCard} ${unpaidCount > 0 ? styles.statCardAccent : ""}`}>
          <span className={styles.statIconWrap} aria-hidden>
            <FileText size={18} />
          </span>
          <span className={styles.statLabel}>Unpaid invoices</span>
          <span className={styles.statValue}>{unpaidCount}</span>
          <span className={styles.statSub}>
            {unpaidCount > 0
              ? formatInvoiceAmount(unpaidTotal, currency, true)
              : "All caught up"}
          </span>
        </div>
      </div>

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

      <section aria-label="Latest notices">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Latest notices</h2>
          <Link href={MOBILE_ROUTES.customer.content} className={styles.sectionLink}>
            View all
          </Link>
        </div>

        {notices.length === 0 ? (
          <div className={styles.emptyNotices}>
            <h3 className={styles.emptyTitle}>No notices right now</h3>
            <p className={styles.emptyDesc}>
              Service updates, guides, and policies will appear here when published.
            </p>
          </div>
        ) : (
          <div className={styles.noticeList}>
            {notices.map((post) => (
              <ContentPostCard key={post.id} post={post} pinnedHighlight={post.isPinned} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
