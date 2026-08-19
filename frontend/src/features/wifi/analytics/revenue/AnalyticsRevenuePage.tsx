"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, Tag, Typography, theme } from "antd";
import { TrendingUp } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsRevenue } from "./useAnalyticsRevenue";
import { formatCount, formatMoney, formatMonthLabel } from "./utils";
import RevenueToolbar from "./components/RevenueToolbar";
import RevenueKpiCards from "./components/RevenueKpiCards";
import RevenueTrendChart from "./components/RevenueTrendChart";
import RevenueTierTable from "./components/RevenueTierTable";
import RevenueTierSitesTable from "./components/RevenueTierSitesTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsRevenuePage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    month,
    formOptions,
    selectOrg,
    selectMonth,
    refresh,
    loadFormOptions,
  } = useAnalyticsRevenue();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (
      initDone &&
      meta?.memberships?.length === 1 &&
      !orgId &&
      !(meta?.canSwitchOrg ?? formOptions.canSwitchOrg)
    ) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, meta?.canSwitchOrg, formOptions.canSwitchOrg, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.orgId && !orgId && !(meta?.canSwitchOrg ?? formOptions.canSwitchOrg)) {
      selectOrg(meta.orgId);
    }
  }, [meta?.orgId, meta?.canSwitchOrg, formOptions.canSwitchOrg, orgId, selectOrg]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showOrgSwitcher =
    memberships.length > 1 ||
    Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection);
  const needsOrg = Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? formOptions.currency;
  const monthLabel = analytics?.month ? formatMonthLabel(analytics.month) : formatMonthLabel(month);

  const scrollToTier = (stationSizeId: string) => {
    const el = document.getElementById(`revenue-tier-${stationSizeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={TrendingUp} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load revenue analytics"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showOrgSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              loading={loading}
              onChange={(id) => selectOrg(id)}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              title="Select an organization"
              description="Choose a tenant to view revenue analytics."
            />
          ) : null}

          {analytics ? (
            <>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Revenue overview
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {monthLabel ? ` · ${monthLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag>{currency}</Tag>
                      <Tag color="geekblue">{formatCount(analytics.summary.tierCount)} tiers</Tag>
                      <Tag>{formatCount(analytics.summary.siteCount)} sites</Tag>
                      <Tag color={analytics.dataSource === "aggregated" ? "blue" : "orange"}>
                        {analytics.dataSource === "aggregated" ? "Aggregated" : "Live"}
                      </Tag>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Gross revenue
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(analytics.summary.revenue, currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Net {formatMoney(analytics.summary.netRevenue, currency)} ·{" "}
                      {formatCount(analytics.summary.ordersCount)} paid order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                    </Text>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 14 }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <RevenueToolbar
                      month={analytics.month || month}
                      loading={loading}
                      onMonthChange={selectMonth}
                      onRefresh={refresh}
                    />
                  </div>
                </div>
              </Card>

              <RevenueKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
              />

              <RevenueTrendChart
                points={analytics.trend}
                currency={currency}
                granularity={analytics.trendGranularity}
                loading={loading}
              />

              <RevenueTierTable
                rows={analytics.byTier}
                currency={currency}
                loading={loading}
                onSelectTier={scrollToTier}
              />

              {analytics.byTier.map((tier) => (
                <RevenueTierSitesTable
                  key={tier.stationSizeId}
                  tier={tier}
                  currency={currency}
                  loading={loading}
                />
              ))}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No revenue data"
              description="There is no sales activity for the selected month."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsRevenuePage;
