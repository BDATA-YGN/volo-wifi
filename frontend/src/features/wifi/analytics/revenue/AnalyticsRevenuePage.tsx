"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Card, Col, Row, Tag, Typography, theme } from "antd";
import { TrendingUp } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsRevenue } from "./useAnalyticsRevenue";
import type { PeriodPreset } from "./types";
import RevenueToolbar from "./components/RevenueToolbar";
import RevenueKpiCards from "./components/RevenueKpiCards";
import RevenueTrendChart from "./components/RevenueTrendChart";
import RevenuePaymentTable from "./components/RevenuePaymentTable";
import RevenueOrderStatusTable from "./components/RevenueOrderStatusTable";
import { formatMoney, granularityLabel } from "./utils";

const { Title, Paragraph, Text } = Typography;

const AnalyticsRevenuePage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    preset,
    formOptions,
    selectOrg,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
    loadFormOptions,
  } = useAnalyticsRevenue();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.orgId && !orgId) {
      selectOrg(meta.orgId);
    }
  }, [meta?.orgId, orgId, selectOrg]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? formOptions.currency;

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const handlePresetChange = (value: PeriodPreset) => {
    setCustomRange(null);
    clearCustomPeriod();
    selectPreset(value);
  };

  const handleCustomRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    setCustomRange(range);
    if (range?.[0] && range?.[1]) {
      selectCustomPeriod(
        range[0].startOf("day").toISOString(),
        range[1].endOf("day").toISOString()
      );
    } else {
      clearCustomPeriod();
    }
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
        <div className="mb-5 max-w-3xl">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Revenue and order trends — gross and net revenue, commission, payments, and order volume
            from daily, monthly, and yearly stats plus live{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link> and{" "}
            <Link href="/wifi/commerce/transactions/payments">Payments</Link>.
          </Paragraph>
        </div>

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
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag>{currency}</Tag>
                      <Tag color="geekblue">
                        {granularityLabel(analytics.trendGranularity)} trend
                      </Tag>
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
                      {analytics.summary.ordersCount} paid order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RevenueToolbar
                  preset={preset}
                  customRange={customRange}
                  trendGranularity={analytics.trendGranularity}
                  dataSource={analytics.dataSource}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
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

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <RevenuePaymentTable
                    rows={analytics.byPaymentMethod}
                    currency={currency}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <RevenueOrderStatusTable
                    rows={analytics.byOrderStatus}
                    currency={currency}
                    loading={loading}
                  />
                </Col>
              </Row>
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No revenue data"
              description="There is no sales or payment activity for the selected period."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsRevenuePage;
