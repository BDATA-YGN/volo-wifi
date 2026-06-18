"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Card, Col, Row, Tag, Typography, theme } from "antd";
import { LineChart } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import { formatWifiDate } from "@/features/wifi/shared/format";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { STATUS_COLOR } from "@/features/wifi/commerce/partners/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import PartnerSwitcher from "@/features/wifi/commerce/partners/workspace/components/PartnerSwitcher";
import { useCommercePartnersInsights } from "./useCommercePartnersInsights";
import type { PeriodPreset } from "./types";
import InsightsToolbar from "./components/InsightsToolbar";
import InsightsKpiCards from "./components/InsightsKpiCards";
import InsightsTrendChart from "./components/InsightsTrendChart";
import InsightsPlanTable from "./components/InsightsPlanTable";
import InsightsStationTable from "./components/InsightsStationTable";
import { formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

const CommercePartnersInsightsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    insights,
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
    refresh,
    loadFormOptions,
  } = useCommercePartnersInsights();

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

  useEffect(() => {
    if (meta?.resellerId && !resellerId) {
      selectReseller(meta.resellerId);
    }
  }, [meta?.resellerId, resellerId, selectReseller]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const resellers = meta?.resellers ?? formOptions.resellers;
  const isPartner = meta?.mode === "partner";
  const showOrgSwitcher = !isPartner && memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const showPartnerSwitcher =
    !isPartner && (meta?.requiresResellerSelection || resellers.length > 1);
  const needsPartner =
    Boolean(meta?.requiresResellerSelection) && !resellerId && Boolean(orgId);
  const currency = insights?.org.currency ?? formOptions.currency;

  const periodLabel = useMemo(() => {
    if (!insights) return null;
    return `${formatWifiDate(insights.periodFrom)} – ${formatWifiDate(insights.periodTo)}`;
  }, [insights]);

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
      <CommonHeader icon={LineChart} />

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
            Reseller-scoped sales and WiFi usage analytics — revenue, commission, sessions, and
            data transfer from{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link> and daily stats. Configure
            partners in <Link href="/wifi/commerce/partners">Partner Directory</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load partner insights"
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
              onChange={selectOrg}
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

          {showPartnerSwitcher && orgId && resellers.length > 0 ? (
            <PartnerSwitcher
              resellers={resellers}
              value={resellerId ?? meta?.resellerId}
              required={needsPartner}
              loading={loading}
              onChange={selectReseller}
            />
          ) : null}

          {needsPartner ? (
            <Alert
              type="info"
              showIcon
              title="Select a partner"
              description={
                <span>
                  Pick a reseller to view their performance, or create partners in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link>.
                </span>
              }
            />
          ) : null}

          {orgId && resellers.length === 0 && !insights && !loading && initDone && !isPartner ? (
            <Alert
              type="warning"
              showIcon
              title="No partners configured"
              description={
                <span>
                  Create reseller accounts in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link> before viewing
                  insights.
                </span>
              }
            />
          ) : null}

          {insights ? (
            <>
              {isPartner ? null : (
                <Alert
                  type="info"
                  showIcon
                  className="mb-0"
                  title="Admin view"
                  description="You are viewing analytics for a selected partner account."
                />
              )}

              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {insights.reseller.name}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {insights.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{insights.reseller.code}</Tag>
                      <Tag color={STATUS_COLOR[insights.reseller.status]}>
                        {formatStatusLabel(insights.reseller.status)}
                      </Tag>
                      <Tag>{currency}</Tag>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Period revenue
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(insights.summary.revenue, currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {insights.summary.ordersCount} order
                      {insights.summary.ordersCount === 1 ? "" : "s"}
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
                  dataSource={insights.dataSource}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <InsightsKpiCards
                summary={insights.summary}
                previous={insights.previousSummary}
                currency={currency}
                loading={loading}
              />

              <InsightsTrendChart
                points={insights.dailyTrend}
                currency={currency}
                loading={loading}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <InsightsPlanTable rows={insights.byPlan} currency={currency} loading={loading} />
                </Col>
                <Col xs={24} lg={12}>
                  <InsightsStationTable
                    rows={insights.byStation}
                    currency={currency}
                    loading={loading}
                  />
                </Col>
              </Row>
            </>
          ) : initDone && !loading && !needsOrg && !needsPartner && !error ? (
            <Alert
              type="warning"
              showIcon
              title="No insights available"
              description="Select a partner or link your account to a reseller profile to view analytics."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CommercePartnersInsightsPage;
