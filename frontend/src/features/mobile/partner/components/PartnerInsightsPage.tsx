"use client";

import { useEffect, useState } from "react";
import { Segmented, Spin } from "antd";
import { useRequest } from "ahooks";
import * as InsightsQuery from "@/features/wifi/commerce/partners/insights/query";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import type { PeriodPreset } from "@/features/wifi/commerce/partners/insights/types";
import styles from "./partner.module.css";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";

export default function PartnerInsightsPage() {
  const [initDone, setInitDone] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();
  const [resellerId, setResellerId] = useState<string | undefined>();
  const [preset, setPreset] = useState<PeriodPreset>("30d");

  const { data, loading, error } = useRequest(
    () => InsightsQuery.loadInsights({ orgId, resellerId, preset }),
    { refreshDeps: [orgId, resellerId, preset] },
  );

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void InsightsQuery.loadFormOptions()
      .then((res) => {
        const meta = res.meta as { orgId?: string; resellerId?: string } | undefined;
        if (meta?.orgId) setOrgId(meta.orgId);
        if (meta?.resellerId) setResellerId(meta.resellerId);
      })
      .finally(() => setInitDone(true));
  }, []);

  const insights = data?.data;

  if (!initDone || (loading && !insights)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading insights…</span>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className={styles.partnerPage}>
        <div className={styles.errorBanner} role="alert">
          {error ? String(error) : "Could not load insights."}
        </div>
      </div>
    );
  }

  const { summary, org } = insights;
  const currency = org.currency;

  return (
    <div className={styles.partnerPage}>
      <Segmented
        block
        value={preset}
        onChange={(value) => setPreset(value as PeriodPreset)}
        options={[
          { label: "7 days", value: "7d" },
          { label: "30 days", value: "30d" },
          { label: "90 days", value: "90d" },
        ]}
      />

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Orders</p>
          <p className={styles.statValue}>{summary.ordersCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Revenue</p>
          <p className={styles.statValue}>{formatMoney(summary.revenue, currency)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Commission</p>
          <p className={styles.statValue}>{formatMoney(summary.commission, currency)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Net</p>
          <p className={styles.statValue}>{formatMoney(summary.netRevenue, currency)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Sessions</p>
          <p className={styles.statValue}>{summary.sessionsCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Unique tokens</p>
          <p className={styles.statValue}>{summary.uniqueCredentials}</p>
        </div>
      </div>

      {insights.byPlan.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>By plan</h2>
          <div className={styles.listStack}>
            {insights.byPlan.slice(0, 8).map((row) => (
              <div key={row.planId ?? row.planCode} className={styles.listCard}>
                <div className={styles.listRow}>
                  <div>
                    <p className={styles.listPrimary}>{row.planName}</p>
                    <p className={styles.listSecondary}>{row.ordersCount} orders</p>
                  </div>
                  <div className={styles.listMeta}>
                    {formatMoney(row.revenue, currency)}
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
