"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Spin } from "antd";
import { BarChart3, KeyRound } from "lucide-react";
import { useCommercePartnersWorkspace } from "@/features/wifi/commerce/partners/workspace/useCommercePartnersWorkspace";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import { PARTNER_ROUTES } from "../constants";
import styles from "./partner.module.css";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";

export default function PartnerHomePage() {
  const [initDone, setInitDone] = useState(false);
  const { dashboard, loading, error, loadFormOptions, refresh } = useCommercePartnersWorkspace();

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  if (!initDone || (loading && !dashboard)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading workspace…</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className={styles.partnerPage}>
        <div className={styles.errorBanner} role="alert">
          {error ? String(error) : "Could not load workspace."}
        </div>
        <button type="button" className={styles.fab} onClick={() => refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const { reseller, org, stats, readiness } = dashboard;
  const currency = org.currency;

  return (
    <div className={styles.partnerPage}>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>{org.name}</p>
        <h1 className={styles.heroTitle}>{reseller.name}</h1>
        <p className={styles.heroMeta}>
          {formatStatusLabel(reseller.status)}
          {readiness.canSellTokens ? " · Ready to sell" : " · Setup incomplete"}
        </p>
      </section>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Today</p>
          <p className={styles.statValue}>{stats.ordersToday}</p>
          <p className={styles.listSecondary}>orders</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Revenue today</p>
          <p className={styles.statValue}>{formatMoney(stats.revenueToday, currency)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active tokens</p>
          <p className={styles.statValue}>{stats.credentialsActive}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>This month</p>
          <p className={styles.statValue}>{formatMoney(stats.revenueMonth, currency)}</p>
        </div>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Quick actions</h2>
        <div className={styles.quickGrid}>
          <Link href={PARTNER_ROUTES.tokens} className={styles.quickAction}>
            <KeyRound size={18} aria-hidden />
            <span className={styles.quickLabel}>Sell tokens</span>
          </Link>
          <Link href={PARTNER_ROUTES.orders} className={styles.quickAction}>
            <BarChart3 size={18} aria-hidden />
            <span className={styles.quickLabel}>View orders</span>
          </Link>
          <Link href={PARTNER_ROUTES.insights} className={styles.quickAction}>
            <BarChart3 size={18} aria-hidden />
            <span className={styles.quickLabel}>Insights</span>
          </Link>
        </div>
      </section>

      {dashboard.recentOrders.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>Recent orders</h2>
          <div className={styles.listStack}>
            {dashboard.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className={styles.listCard}>
                <div className={styles.listRow}>
                  <div>
                    <p className={styles.listPrimary}>{order.orderNo}</p>
                    <p className={styles.listSecondary}>
                      {order.station?.name ?? "—"} · {order.itemCount} item
                      {order.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className={styles.listMeta}>
                    {formatMoney(order.total, order.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
