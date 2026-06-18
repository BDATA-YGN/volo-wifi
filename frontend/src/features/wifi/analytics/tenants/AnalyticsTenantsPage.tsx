"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Tag, Typography, theme } from "antd";
import { BarChart3, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import { useAnalyticsTenants } from "./useAnalyticsTenants";
import type { PeriodPreset } from "./types";
import TenantsKpiCards from "./components/TenantsKpiCards";
import TenantsTrendChart from "./components/TenantsTrendChart";
import TenantsTable from "./components/TenantsTable";
import { formatMoney, resolveDisplayCurrency } from "./utils";

const { Title, Paragraph, Text } = Typography;

const AnalyticsTenantsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    preset,
    selectOrg,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
  } = useAnalyticsTenants();

  const memberships = meta?.memberships ?? [];
  const isPlatformView = Boolean(meta?.isPlatformView) && !orgId;
  const showOrgSwitcher = memberships.length > 1;
  const singleTenant = Boolean(orgId) || memberships.length === 1;
  const scopedTenant = useMemo(() => {
    if (!orgId || !analytics?.byTenant.length) return null;
    return analytics.byTenant.find((t) => t.orgId === orgId) ?? analytics.byTenant[0];
  }, [orgId, analytics?.byTenant]);

  const currency = useMemo(
    () => resolveDisplayCurrency(analytics?.byTenant ?? []),
    [analytics?.byTenant]
  );

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

  const handleClearTenantFilter = () => {
    selectOrg(undefined);
  };

  return (
    <div className="p-0">
      <CommonHeader icon={BarChart3} />

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
            Cross-tenant sales and WiFi usage summary — revenue, orders, commission, and sessions
            aggregated from daily stats and{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>. Manage tenants in{" "}
            <Link href="/wifi/tenant/profile">Tenant Profile</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load tenant analytics"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showOrgSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              allowClear={isPlatformView}
              loading={loading}
              onChange={(id) => selectOrg(id)}
              onClear={handleClearTenantFilter}
            />
          ) : null}

          {memberships.length === 0 && !loading ? (
            <Alert
              type="warning"
              showIcon
              title="No tenant access"
              description="You do not have permission to view any tenant analytics."
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
                      {scopedTenant ? scopedTenant.name : "Platform overview"}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {isPlatformView
                        ? `${analytics.summary.tenantCount} tenants in scope`
                        : scopedTenant
                          ? `Single-tenant drill-down`
                          : "Tenant analytics"}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      {scopedTenant ? (
                        <>
                          <Tag style={{ fontFamily: "monospace" }}>{scopedTenant.code}</Tag>
                          <Tag color={scopedTenant.isActive ? "success" : "default"}>
                            {scopedTenant.isActive ? "Active" : "Inactive"}
                          </Tag>
                        </>
                      ) : (
                        <Tag color="blue">Cross-tenant</Tag>
                      )}
                      <Tag>{currency}</Tag>
                      {orgId ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<X size={14} />}
                          onClick={handleClearTenantFilter}
                          style={{ padding: 0, height: "auto" }}
                        >
                          Clear tenant filter
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Period revenue
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(analytics.summary.revenue, currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analytics.summary.ordersCount} order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                      {!singleTenant
                        ? ` · ${analytics.summary.activeTenantCount} active tenant${
                            analytics.summary.activeTenantCount === 1 ? "" : "s"
                          }`
                        : ""}
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <InsightsToolbar
                  preset={preset}
                  customRange={customRange}
                  dataSource={analytics.dataSource}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <TenantsKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
                singleTenant={singleTenant}
              />

              <TenantsTrendChart
                points={analytics.dailyTrend}
                currency={currency}
                loading={loading}
                showActiveTenants={!singleTenant}
              />

              {!singleTenant ? (
                <TenantsTable
                  rows={analytics.byTenant}
                  loading={loading}
                  selectedOrgId={orgId}
                  onSelectTenant={(id) => selectOrg(id)}
                />
              ) : null}
            </>
          ) : memberships.length > 0 && !loading && !error ? (
            <Alert
              type="info"
              showIcon
              title="No analytics data"
              description="There is no sales or usage activity for the selected period."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTenantsPage;
