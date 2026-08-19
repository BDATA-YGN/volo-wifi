"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Segmented, Tag, Typography, theme } from "antd";
import { Gauge, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsLiveOps } from "./useAnalyticsLiveOps";
import type { LiveOpsTab } from "./types";
import { formatBytes } from "./utils";
import { LIVE_OPS_TABS } from "./constant";
import LiveOpsToolbar from "./components/LiveOpsToolbar";
import LiveOpsFilterBar from "./components/LiveOpsFilterBar";
import LiveOpsKpiCards from "./components/LiveOpsKpiCards";
import LiveOpsTrendChart from "./components/LiveOpsTrendChart";
import LiveOpsSiteTable from "./components/LiveOpsSiteTable";

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
    stationSizeId,
    planId,
    profile,
    date,
    refreshMs,
    tab,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectPlan,
    selectProfile,
    selectDate,
    selectRefreshMs,
    selectTab,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsLiveOps();

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
  const stations = formOptions.stations;
  const stationSizes = formOptions.stationSizes ?? [];
  const plans = formOptions.plans ?? [];
  const profiles =
    formOptions.profiles && formOptions.profiles.length > 0
      ? formOptions.profiles
      : [
          { value: "MikroTik", label: "MikroTik" },
          { value: "Ruijie", label: "Ruijie" },
        ];
  const showOrgSwitcher =
    memberships.length > 1 ||
    Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection);
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? "MMK";
  const hasFilters = Boolean(stationId || stationSizeId || planId || profile);

  const windowLabel = useMemo(() => {
    if (!analytics) return null;
    return dayjs(analytics.date || analytics.windowFrom).format("D MMM YYYY");
  }, [analytics]);

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
                      {refreshMs > 0 ? (
                        <Tag color="success">
                          Auto-refresh {REFRESH_LABEL[refreshMs] ?? `${refreshMs / 1000}s`}
                        </Tag>
                      ) : (
                        <Tag>Auto-refresh off</Tag>
                      )}
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

                <div style={{ marginTop: 16, paddingTop: 14 }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <LiveOpsFilterBar
                      stations={stations}
                      stationSizes={stationSizes}
                      profiles={profiles}
                      plans={plans}
                      stationId={stationId}
                      stationSizeId={stationSizeId}
                      profile={profile}
                      planId={planId}
                      loading={loading}
                      onStationChange={selectStation}
                      onStationSizeChange={selectStationSize}
                      onProfileChange={selectProfile}
                      onPlanChange={selectPlan}
                    />
                    <LiveOpsToolbar
                      date={date}
                      generatedAt={analytics.generatedAt}
                      refreshMs={refreshMs}
                      loading={loading}
                      onDateChange={selectDate}
                      onRefreshMsChange={selectRefreshMs}
                      onRefresh={refresh}
                    />
                  </div>
                </div>
              </Card>

              <Segmented
                value={tab}
                options={LIVE_OPS_TABS.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                onChange={(value) => selectTab(value as LiveOpsTab)}
              />

              {tab === "stats" ? (
                <div className="flex flex-col gap-4">
                  <LiveOpsKpiCards
                    summary={analytics.summary}
                    currency={currency}
                    loading={loading}
                  />
                  <LiveOpsTrendChart
                    points={analytics.hourlyTrend}
                    currency={currency}
                    loading={loading}
                  />
                </div>
              ) : (
                <LiveOpsSiteTable
                  rows={analytics.bySite}
                  loading={loading}
                  selectedStationId={stationId}
                  onSelectSite={(id) => selectStation(id)}
                />
              )}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No live activity"
              description="There is no session or order activity for the selected date and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const REFRESH_LABEL: Record<number, string> = {
  15000: "15s",
  30000: "30s",
  60000: "1 min",
  300000: "5 min",
};

export default AnalyticsLiveOpsPage;
