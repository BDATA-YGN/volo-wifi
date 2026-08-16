"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, Col, Row, Tag, Typography, theme } from "antd";
import { LayoutDashboard } from "lucide-react";
import { formatWifiDateTimeWithSeconds } from "@/features/wifi/shared/format";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { needsOrgSelection, shouldShowOrgSwitcher } from "@/features/wifi/shared/hooks/useWifiOrgScope";
import { useWifiOverview } from "./useWifiOverview";
import { useDashboardWidgets } from "./hooks/useDashboardWidgets";
import { formatBytes, formatMoney, formatPersona } from "./utils";
import DashboardToolbar from "./components/DashboardToolbar";
import DashboardWidgetGrid from "./components/DashboardWidgetGrid";
import DashboardTrendChart from "./components/DashboardTrendChart";
import DashboardSitePulse from "./components/DashboardSitePulse";
import DashboardActivityFeed from "./components/DashboardActivityFeed";

const { Title, Paragraph, Text } = Typography;

const WifiOverviewPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);

  const {
    dashboard,
    meta,
    loading,
    error,
    orgId,
    autoRefresh,
    formOptions,
    selectOrg,
    toggleAutoRefresh,
    refresh,
    loadFormOptions,
  } = useWifiOverview();

  const widgets = useDashboardWidgets(
    dashboard?.context.persona ?? "",
    dashboard?.context.orgRoleCodes ?? []
  );

  const showTrend = widgets.some((w) => w.id === "analytics" || w.id === "commerce");
  const showSitePulse = widgets.some(
    (w) => w.id === "operations" || w.id === "network" || w.id === "analytics"
  );
  const showActivity = widgets.some((w) => w.id === "operations" || w.id === "commerce");

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (!initDone || orgId || meta?.requiresOrgSelection || meta?.canSwitchOrg) return;
    if (meta?.memberships?.length === 1) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, meta?.requiresOrgSelection, meta?.canSwitchOrg, orgId, selectOrg]);

  useEffect(() => {
    if (meta?.requiresOrgSelection || meta?.canSwitchOrg) return;
    if (meta?.orgId && !orgId) {
      selectOrg(meta.orgId);
    }
  }, [meta?.orgId, meta?.requiresOrgSelection, meta?.canSwitchOrg, orgId, selectOrg]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showOrgSwitcher = shouldShowOrgSwitcher(memberships, meta);
  const needsOrg = needsOrgSelection(orgId, meta, memberships.length);
  const currency = dashboard?.org.currency ?? "MMK";

  const personaLabel = useMemo(() => {
    if (!dashboard?.context) return null;
    return formatPersona(dashboard.context.persona);
  }, [dashboard?.context]);

  return (
    <div className="p-0">
      <CommonHeader icon={LayoutDashboard} />

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
            title="Failed to load dashboard"
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
              description="Choose a tenant to view the operational dashboard."
            />
          ) : null}

          {dashboard ? (
            <>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {dashboard.org.name}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      WiFi operations dashboard
                      {personaLabel ? ` · ${personaLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{dashboard.org.code}</Tag>
                      <Tag color="processing">{dashboard.summary.activeSessions} live</Tag>
                      <Tag color="success">
                        {formatMoney(dashboard.summary.todayRevenue, currency)} today
                      </Tag>
                      {dashboard.summary.stalledSessions > 0 ? (
                        <Tag color="warning">{dashboard.summary.stalledSessions} stalled</Tag>
                      ) : null}
                      {autoRefresh ? <Tag color="blue">Live refresh</Tag> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Active traffic
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatBytes(dashboard.summary.activeBytes)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatWifiDateTimeWithSeconds(dashboard.generatedAt)}
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <DashboardToolbar
                  generatedAt={dashboard.generatedAt}
                  autoRefresh={autoRefresh}
                  loading={loading}
                  onAutoRefreshChange={toggleAutoRefresh}
                  onRefresh={refresh}
                />
              </Card>

              <DashboardWidgetGrid
                widgets={widgets}
                summary={dashboard.summary}
                currency={currency}
                loading={loading}
              />

              {showTrend || showSitePulse ? (
                <Row gutter={[16, 16]}>
                  {showTrend ? (
                    <Col xs={24} lg={showSitePulse ? 14 : 24}>
                      <DashboardTrendChart
                        points={dashboard.trend7d}
                        currency={currency}
                        loading={loading}
                      />
                    </Col>
                  ) : null}
                  {showSitePulse ? (
                    <Col xs={24} lg={showTrend ? 10 : 24}>
                      <DashboardSitePulse
                        rows={dashboard.topSites}
                        currency={currency}
                        loading={loading}
                      />
                    </Col>
                  ) : null}
                </Row>
              ) : null}

              {showActivity ? (
                <DashboardActivityFeed
                  sessionHealth={dashboard.sessionHealth}
                  partnerSales={dashboard.partnerSales}
                  currency={currency}
                  loading={loading}
                />
              ) : null}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No dashboard data"
              description="There is no operational activity for this organization yet."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default WifiOverviewPage;
