"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import { BarChart3, KeyRound } from "lucide-react";
import { useCommercePartnersWorkspace } from "@/features/wifi/commerce/partners/workspace/useCommercePartnersWorkspace";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import { PARTNER_ROUTES } from "../constants";
import styles from "./partner.module.css";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";
import PartnerPlanSalesList from "./PartnerPlanSalesList";
import PartnerSiteFilter, { usePartnerStationScope } from "./PartnerSiteFilter";

export default function PartnerHomePage() {
  const [initDone, setInitDone] = useState(false);
  const { dashboard, loading, error, loadFormOptions, refresh } = useCommercePartnersWorkspace();

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  const siteIds = useMemo(
    () => (dashboard?.stations ?? []).map((station) => station.id),
    [dashboard],
  );
  const { stationId, setStationId } = usePartnerStationScope(siteIds);

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

  const { org, stats, stations, recentOrders } = dashboard;
  const currency = org.currency;
  const salesByPlanToday = stats.salesByPlanToday ?? [];
  const salesByStationToday = stats.salesByStationToday ?? [];
  const multiSite = stations.length > 1;
  const selectedStation = stationId
    ? salesByStationToday.find((row) => row.stationId === stationId)
    : null;
  const selectedStationName =
    selectedStation?.stationName ??
    stations.find((station) => station.id === stationId)?.name ??
    null;
  const planRows = selectedStation?.plans ?? salesByPlanToday;
  const tokensToday = selectedStation
    ? selectedStation.tokenCount
    : (stats.tokensToday ?? salesByPlanToday.reduce((sum, row) => sum + row.tokenCount, 0));
  const amountToday = selectedStation
    ? selectedStation.amount
    : salesByPlanToday.length > 0
      ? salesByPlanToday.reduce((sum, row) => sum + row.amount, 0)
      : stats.revenueToday;
  const visibleOrders = stationId
    ? recentOrders.filter((order) => order.station?.id === stationId)
    : recentOrders;
  const siteOptions = (salesByStationToday.length > 0
    ? salesByStationToday
    : stations.map((station) => ({
        stationId: station.id,
        stationName: station.name,
        tokenCount: 0,
        amount: 0,
      }))
  ).map((row) => ({
    stationId: row.stationId,
    stationName: row.stationName,
    tokenCount: row.tokenCount,
    amount: row.amount,
  }));

  return (
    <div className={styles.partnerPage}>
      {multiSite ? (
        <PartnerSiteFilter sites={siteOptions} value={stationId} onChange={setStationId} />
      ) : null}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Tokens today</p>
          <p className={styles.statValue}>{tokensToday}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Amount today</p>
          <p className={styles.statValue}>{formatMoney(amountToday, currency)}</p>
        </div>
      </div>

      {multiSite && !stationId ? (
        <section>
          <h2 className={styles.sectionTitle}>By shop</h2>
          <div className={styles.shopGrid}>
            {siteOptions.map((site) => (
              <button
                key={site.stationId}
                type="button"
                className={styles.shopCard}
                onClick={() => setStationId(site.stationId)}
              >
                <p className={styles.shopCardName}>{site.stationName}</p>
                <p className={styles.shopCardQty}>
                  {site.tokenCount} token{site.tokenCount === 1 ? "" : "s"}
                </p>
                <p className={styles.shopCardAmount}>{formatMoney(site.amount, currency)}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className={styles.sectionTitle}>
          {selectedStationName ? `Today · ${selectedStationName}` : "Today by plan"}
        </h2>
        <PartnerPlanSalesList
          rows={planRows}
          currency={currency}
          emptyText={
            selectedStationName
              ? `No sales at ${selectedStationName} today.`
              : "No sellable plans assigned yet."
          }
        />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Quick actions</h2>
        <div className={styles.quickGrid}>
          <Link href={PARTNER_ROUTES.tokens} className={styles.quickAction}>
            <KeyRound size={18} aria-hidden />
            <span className={styles.quickLabel}>Sell tokens</span>
          </Link>
          <Link href={PARTNER_ROUTES.orders} className={styles.quickAction}>
            <BarChart3 size={18} aria-hidden />
            <span className={styles.quickLabel}>View report</span>
          </Link>
          <Link href={PARTNER_ROUTES.insights} className={styles.quickAction}>
            <BarChart3 size={18} aria-hidden />
            <span className={styles.quickLabel}>Insights</span>
          </Link>
        </div>
      </section>

      {visibleOrders.length > 0 ? (
        <section>
          <h2 className={styles.sectionTitle}>Recent orders</h2>
          <div className={styles.listStack}>
            {visibleOrders.slice(0, 5).map((order) => (
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
