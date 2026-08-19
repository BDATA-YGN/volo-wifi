"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Activity, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsSessionTraffic } from "./useAnalyticsSessionTraffic";
import { formatBytes } from "./utils";
import TrafficToolbar from "./components/TrafficToolbar";
import TrafficKpiCards from "./components/TrafficKpiCards";
import TrafficTrendChart from "./components/TrafficTrendChart";
import TrafficSiteTable from "./components/TrafficSiteTable";
import TrafficPlanTable from "./components/TrafficPlanTable";
import TrafficTerminateTable from "./components/TrafficTerminateTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsSessionTrafficPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    planId,
    formOptions,
    selectOrg,
    selectStation,
    selectPlan,
    selectCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsSessionTraffic();

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
    if (customRange?.[0] && customRange?.[1]) {
      selectCustomPeriod(
        customRange[0].startOf("day").toISOString(),
        customRange[1].endOf("day").toISOString(),
      );
    }
    // initialize default period to today once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const stations = formOptions.stations;
  const plans = formOptions.plans;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const scopedSite = useMemo(() => {
    if (!stationId) return null;
    return (
      analytics?.bySite.find((s) => s.stationId === stationId) ??
      stations.find((s) => s.id === stationId) ??
      null
    );
  }, [stationId, analytics?.bySite, stations]);

  const scopedPlan = useMemo(() => {
    if (!planId) return null;
    return plans.find((p) => p.id === planId) ?? null;
  }, [planId, plans]);

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    const from = dayjs(analytics.periodFrom);
    const to = dayjs(analytics.periodTo);
    if (from.isSame(to, "day")) return from.format("D MMM YYYY");
    return `${from.format("D MMM YYYY")} – ${to.format("D MMM YYYY")}`;
  }, [analytics]);

  const handleCustomRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    setCustomRange(range);
    if (range?.[0] && range?.[1]) {
      selectCustomPeriod(
        range[0].startOf("day").toISOString(),
        range[1].endOf("day").toISOString()
      );
    } else {
      const today: [Dayjs, Dayjs] = [dayjs().startOf("day"), dayjs().endOf("day")];
      setCustomRange(today);
      selectCustomPeriod(today[0].toISOString(), today[1].toISOString());
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Activity} />

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
            title="Failed to load session traffic analytics"
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
              description="Choose a tenant to view session traffic analytics."
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
                      Session traffic
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="success">{analytics.summary.activeSessionsNow} active now</Tag>
                      <Tag color="blue">
                        {analytics.dataSource === "aggregated" ? "Aggregated" : "Live data"}
                      </Tag>
                      {scopedSite ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedSite.code}</Tag>
                      ) : null}
                      {scopedPlan ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedPlan.code}</Tag>
                      ) : null}
                      {stationId || planId ? (
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
                      Total bandwidth
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatBytes(analytics.summary.totalBytes)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analytics.summary.sessionsCount} sessions ·{" "}
                      {analytics.summary.uniqueCredentials} users
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <TrafficToolbar
                  customRange={customRange}
                  stations={stations}
                  plans={plans}
                  stationId={stationId}
                  planId={planId}
                  loading={loading}
                  dataSource={analytics.dataSource}
                  onCustomRangeChange={handleCustomRangeChange}
                  onStationChange={selectStation}
                  onPlanChange={selectPlan}
                  onRefresh={refresh}
                />
              </Card>

              <TrafficKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                loading={loading}
              />

              <TrafficTrendChart
                points={analytics.dailyTrend}
                granularity={analytics.trendGranularity}
                loading={loading}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <TrafficSiteTable
                    rows={analytics.bySite}
                    loading={loading}
                    selectedStationId={stationId}
                    onSelectStation={(id) => selectStation(id)}
                  />
                </Col>
                <Col xs={24} lg={10}>
                  <div className="flex flex-col gap-4">
                    <TrafficPlanTable
                      rows={analytics.byPlan}
                      loading={loading}
                      selectedPlanId={planId}
                      onSelectPlan={(id) => selectPlan(id)}
                    />
                    {analytics.byTerminateCause.length > 0 ? (
                      <TrafficTerminateTable
                        rows={analytics.byTerminateCause}
                        loading={loading}
                      />
                    ) : null}
                  </div>
                </Col>
              </Row>
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No session data"
              description="There are no RADIUS sessions for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSessionTrafficPage;
