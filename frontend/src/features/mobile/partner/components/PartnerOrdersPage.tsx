"use client";

import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import "@/lib/timezone";
import * as OrdersQuery from "@/features/wifi/commerce/transactions/orders/query";
import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import type { OrdersMeta, OrderStationSales } from "@/features/wifi/commerce/transactions/orders/types";
import styles from "./partner.module.css";
import { usePartnerAuthRedirect } from "../hooks/usePartnerAuthRedirect";
import PartnerSiteFilter, { usePartnerStationScope } from "./PartnerSiteFilter";

function formatReportDay(dateKey: string): string {
  const today = dayjs().tz().format("YYYY-MM-DD");
  const day = dayjs.tz(dateKey);
  if (dateKey === today) return `Today · ${day.format("D MMM")}`;
  return day.format("ddd D MMM");
}

function ShopDayTable({
  shop,
  currency,
  showName,
}: {
  shop: OrderStationSales;
  currency: string;
  showName: boolean;
}) {
  const days = [...(shop.days ?? [])].reverse();

  return (
    <div className={styles.reportShop}>
      {showName ? (
        <div className={styles.reportShopHead}>
          <p className={styles.reportShopName}>{shop.stationName}</p>
          <p className={styles.reportShopTotals}>
            {shop.tokenCount} token{shop.tokenCount === 1 ? "" : "s"} ·{" "}
            {formatMoney(shop.amount, currency)}
          </p>
        </div>
      ) : null}
      <div className={styles.reportTableWrap}>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Tokens</th>
              <th>Sales</th>
            </tr>
          </thead>
          <tbody>
            {days.length === 0 ? (
              <tr>
                <td colSpan={3}>No daily sales in the last 7 days.</td>
              </tr>
            ) : (
              days.map((row) => {
              const today = row.date === dayjs().tz().format("YYYY-MM-DD");
              const planHint = (row.plans ?? [])
                .filter((plan) => plan.tokenCount > 0)
                .map((plan) => `${plan.planName} ${plan.tokenCount}`)
                .join(" · ");
              return (
                <tr key={row.date}>
                  <td>
                    <span className={today ? styles.reportDayToday : undefined}>
                      {formatReportDay(row.date)}
                    </span>
                    {planHint ? <p className={styles.reportDayPlans}>{planHint}</p> : null}
                  </td>
                  <td>{row.tokenCount}</td>
                  <td>{formatMoney(row.amount, currency)}</td>
                </tr>
              );
            })
            )}
          </tbody>
          <tfoot>
            <tr className={styles.reportTableFoot}>
              <td>Total</td>
              <td>{shop.tokenCount}</td>
              <td>{formatMoney(shop.amount, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function PartnerOrdersPage() {
  const [initDone, setInitDone] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();
  const [resellerId, setResellerId] = useState<string | undefined>();

  const { data, loading, error, refresh } = useRequest(
    () =>
      OrdersQuery.list({
        page: 1,
        limit: 1,
        orgId,
        resellerId,
      }),
    { refreshDeps: [orgId, resellerId] },
  );

  usePartnerAuthRedirect(error);

  useEffect(() => {
    void OrdersQuery.loadFormOptions()
      .then((res) => {
        const meta = res.meta as { orgId?: string; resellerId?: string } | undefined;
        if (meta?.orgId) setOrgId(meta.orgId);
        if (meta?.resellerId) setResellerId(meta.resellerId);
      })
      .finally(() => setInitDone(true));
  }, []);

  const meta = (data?.meta ?? {}) as OrdersMeta;
  const currency = meta.currency ?? "MMK";
  const salesByPlan = meta.salesByPlanLast7Days ?? [];
  const salesByStation = meta.salesByStationLast7Days ?? [];
  const siteIds = useMemo(
    () => salesByStation.map((row) => row.stationId),
    [salesByStation],
  );
  const { stationId, setStationId } = usePartnerStationScope(siteIds);
  const selectedStation = stationId
    ? salesByStation.find((row) => row.stationId === stationId) ?? null
    : null;
  const selectedStationName = selectedStation?.stationName ?? null;
  const tokensLast7Days = selectedStation
    ? selectedStation.tokenCount
    : (meta.tokensLast7Days ?? salesByPlan.reduce((sum, row) => sum + row.tokenCount, 0));
  const revenueLast7Days = selectedStation
    ? selectedStation.amount
    : (meta.revenueLast7Days ?? salesByPlan.reduce((sum, row) => sum + row.amount, 0));
  const siteOptions = salesByStation.map((row) => ({
    stationId: row.stationId,
    stationName: row.stationName,
    tokenCount: row.tokenCount,
    amount: row.amount,
  }));
  const multiSite = salesByStation.length > 1;
  const shopsToShow = selectedStation ? [selectedStation] : salesByStation;

  if (!initDone || (loading && salesByStation.length === 0 && salesByPlan.length === 0)) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading report…</span>
      </div>
    );
  }

  return (
    <div className={styles.partnerPage}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {String(error)}
        </div>
      ) : null}

      {multiSite ? (
        <PartnerSiteFilter sites={siteOptions} value={stationId} onChange={setStationId} />
      ) : null}

      <section>
        <h2 className={styles.sectionTitle}>
          {selectedStationName ? `Last 7 days · ${selectedStationName}` : "Last 7 days"}
        </h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Tokens sold</p>
            <p className={styles.statValue}>{tokensLast7Days}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Revenue</p>
            <p className={styles.statValue}>{formatMoney(revenueLast7Days, currency)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>
          {selectedStationName || !multiSite ? "Daily sales" : "Daily sales by shop"}
        </h2>
        {shopsToShow.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p>No shops assigned yet.</p>
            <button type="button" onClick={() => refresh()}>
              Refresh
            </button>
          </div>
        ) : (
          <div className={styles.reportStack}>
            {shopsToShow.map((shop) => (
              <ShopDayTable
                key={shop.stationId}
                shop={shop}
                currency={currency}
                showName={multiSite && !selectedStation}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
