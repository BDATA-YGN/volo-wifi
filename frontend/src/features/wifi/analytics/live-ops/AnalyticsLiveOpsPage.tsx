"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Gauge, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsLiveOps } from "./useAnalyticsLiveOps";
import type { WindowHours } from "./types";
import { formatBytes } from "./utils";
import LiveOpsToolbar from "./components/LiveOpsToolbar";
import LiveOpsFilterBar from "./components/LiveOpsFilterBar";
import LiveOpsKpiCards from "./components/LiveOpsKpiCards";
import LiveOpsTrendChart from "./components/LiveOpsTrendChart";
import LiveOpsStatusTable from "./components/LiveOpsStatusTable";
import LiveOpsSiteTable from "./components/LiveOpsSiteTable";
import LiveOpsPartnerTable from "./components/LiveOpsPartnerTable";
import LiveOpsRecentSessionsTable from "./components/LiveOpsRecentSessionsTable";
import LiveOpsRecentOrdersTable from "./components/LiveOpsRecentOrdersTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsLiveOpsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    windowHours,
    autoRefresh,
    formOptions,
    selectOrg,
    selectStation,
    selectReseller,
    selectWindowHours,
    toggleAutoRefresh,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsLiveOps();

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
  const stations = formOptions.stations;
  const resellers = formOptions.resellers;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? "MMK";

  const windowLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.windowFrom).format("HH:mm")} – ${dayjs(analytics.windowTo).format("HH:mm")} · ${analytics.windowHours}h window`;
  }, [analytics]);

  const hasFilters = Boolean(stationId || resellerId);

  return (
    <div className="p-0">
      <CommonHeader icon={Gauge} />

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
            Near-real-time operations — active RADIUS sessions, sales velocity, and hourly activity
            across your fleet. Deeper traffic analysis in{" "}
            <Link href="/wifi/analytics/session-traffic">Session Traffic</Link> or revenue in{" "}
            <Link href="/wifi/analytics/revenue">Revenue Analytics</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load live operations"
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
              description="Choose a tenant to view live operations."
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
                      Live operations
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {windowLabel ? ` · ${windowLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="processing">{analytics.summary.activeSessions} live</Tag>
                      {analytics.summary.stalledSessions > 0 ? (
                        <Tag color="warning">{analytics.summary.stalledSessions} stalled</Tag>
                      ) : null}
                      <Tag color="purple">{analytics.summary.ordersCount} orders</Tag>
                      {autoRefresh ? <Tag color="success">Auto-refresh on</Tag> : null}
                      {hasFilters ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<X size={14} />}
                          onClick={clearFilters}
                          style={{ padding: 0, height: "auto" }}
                        >
                          Clear filters
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Active traffic
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatBytes(analytics.summary.activeBytes)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Across {analytics.summary.activeSessions} sessions
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <LiveOpsToolbar
                  windowHours={windowHours}
                  generatedAt={analytics.generatedAt}
                  autoRefresh={autoRefresh}
                  loading={loading}
                  onWindowChange={(v: WindowHours) => selectWindowHours(v)}
                  onAutoRefreshChange={toggleAutoRefresh}
                  onRefresh={refresh}
                />
              </Card>

              <LiveOpsFilterBar
                stations={stations}
                resellers={resellers}
                stationId={stationId}
                resellerId={resellerId}
                loading={loading}
                onStationChange={selectStation}
                onResellerChange={selectReseller}
              />

              <LiveOpsKpiCards
                summary={analytics.summary}
                currency={currency}
                loading={loading}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <LiveOpsTrendChart
                    points={analytics.hourlyTrend}
                    currency={currency}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={8}>
                  <LiveOpsStatusTable rows={analytics.byStatus} loading={loading} />
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <LiveOpsSiteTable
                    rows={analytics.bySite}
                    currency={currency}
                    loading={loading}
                    selectedStationId={stationId}
                    onSelectSite={(id) => selectStation(id)}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <LiveOpsPartnerTable
                    rows={analytics.byPartner}
                    currency={currency}
                    loading={loading}
                    selectedResellerId={resellerId}
                    onSelectPartner={(id) => selectReseller(id)}
                  />
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <LiveOpsRecentSessionsTable
                    rows={analytics.recentSessions}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <LiveOpsRecentOrdersTable rows={analytics.recentOrders} loading={loading} />
                </Col>
              </Row>
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No live activity"
              description="There is no session or order activity in the selected window."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsLiveOpsPage;
