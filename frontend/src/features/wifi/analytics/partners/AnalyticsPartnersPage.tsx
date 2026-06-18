"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Tag, Typography, theme } from "antd";
import { UsersRound, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import { STATUS_COLOR } from "@/features/wifi/commerce/partners/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import { useAnalyticsPartners } from "./useAnalyticsPartners";
import type { PeriodPreset } from "./types";
import PartnersFilterBar from "./components/PartnersFilterBar";
import PartnersKpiCards from "./components/PartnersKpiCards";
import PartnersTrendChart from "./components/PartnersTrendChart";
import PartnersTable from "./components/PartnersTable";
import { formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

const AnalyticsPartnersPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    resellerId,
    preset,
    formOptions,
    selectOrg,
    selectReseller,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsPartners();

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
  const resellers = formOptions.resellers;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? formOptions.currency;
  const singlePartner = Boolean(resellerId);

  const scopedPartner = useMemo(() => {
    if (!resellerId) return null;
    return (
      analytics?.byPartner.find((p) => p.resellerId === resellerId) ??
      resellers.find((r) => r.id === resellerId) ??
      null
    );
  }, [resellerId, analytics?.byPartner, resellers]);

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
      <CommonHeader icon={UsersRound} />

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
            Partner sales performance across your reseller network — revenue, commission, orders, and
            WiFi usage from daily stats and{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>. Manage partners in{" "}
            <Link href="/wifi/commerce/partners">Partner Directory</Link> or open{" "}
            <Link href="/wifi/commerce/partners/insights">Partner Insights</Link> for deep dives.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load partner analytics"
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
              description="Choose a tenant to view partner analytics."
            />
          ) : null}

          {orgId && resellers.length === 0 && initDone && !loading ? (
            <Alert
              type="warning"
              showIcon
              title="No partners configured"
              description={
                <span>
                  Create reseller accounts in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link> before viewing
                  analytics.
                </span>
              }
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
                      {scopedPartner?.name ?? "All partners"}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag>{currency}</Tag>
                      {scopedPartner ? (
                        <>
                          <Tag style={{ fontFamily: "monospace" }}>{scopedPartner.code}</Tag>
                          {"status" in scopedPartner ? (
                            <Tag
                              color={
                                STATUS_COLOR[
                                  scopedPartner.status as keyof typeof STATUS_COLOR
                                ] ?? "default"
                              }
                            >
                              {formatStatusLabel(
                                scopedPartner.status as "ACTIVE" | "SUSPENDED" | "DISABLED"
                              )}
                            </Tag>
                          ) : null}
                          {orgId ? (
                            <Link
                              href={`/wifi/commerce/partners/insights?orgId=${orgId}&resellerId=${resellerId}`}
                            >
                              <Button type="link" size="small" style={{ padding: 0, height: "auto" }}>
                                Open Partner Insights
                              </Button>
                            </Link>
                          ) : null}
                        </>
                      ) : (
                        <Tag color="blue">
                          {analytics.summary.partnerCount} partner
                          {analytics.summary.partnerCount === 1 ? "" : "s"}
                        </Tag>
                      )}
                      {resellerId ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<X size={14} />}
                          onClick={clearFilters}
                          style={{ padding: 0, height: "auto" }}
                        >
                          Clear partner filter
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
                      {formatMoney(analytics.summary.commission, currency)} commission ·{" "}
                      {analytics.summary.ordersCount} order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                      {!singlePartner
                        ? ` · ${analytics.summary.activePartnerCount} active`
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

              {!singlePartner ? (
                <PartnersFilterBar
                  resellers={resellers}
                  resellerId={resellerId}
                  loading={loading}
                  onResellerChange={selectReseller}
                />
              ) : null}

              <PartnersKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
                singlePartner={singlePartner}
              />

              <PartnersTrendChart
                points={analytics.dailyTrend}
                currency={currency}
                loading={loading}
                showActivePartners={!singlePartner}
              />

              {!singlePartner ? (
                <PartnersTable
                  rows={analytics.byPartner}
                  currency={currency}
                  orgId={orgId}
                  loading={loading}
                  selectedResellerId={resellerId}
                  onSelectPartner={(id) => selectReseller(id)}
                />
              ) : null}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error && resellers.length > 0 ? (
            <Alert
              type="info"
              showIcon
              title="No analytics data"
              description="There is no sales or usage activity for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPartnersPage;
