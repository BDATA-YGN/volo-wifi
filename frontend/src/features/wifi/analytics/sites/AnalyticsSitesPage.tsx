"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { MapPin, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import { useAnalyticsSites } from "./useAnalyticsSites";
import type { PeriodPreset } from "./types";
import SitesFilterBar from "./components/SitesFilterBar";
import SitesKpiCards from "./components/SitesKpiCards";
import SitesTrendChart from "./components/SitesTrendChart";
import SitesTable from "./components/SitesTable";
import SitesTierTable from "./components/SitesTierTable";
import { STATION_STATUS_COLOR, formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

const AnalyticsSitesPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    preset,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsSites();

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
  const stationSizes = formOptions.stationSizes;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? formOptions.currency;
  const singleSite = Boolean(stationId);

  const scopedSite = useMemo(() => {
    if (!stationId) return null;
    return (
      analytics?.bySite.find((s) => s.stationId === stationId) ??
      stations.find((s) => s.id === stationId) ??
      null
    );
  }, [stationId, analytics?.bySite, stations]);

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
      <CommonHeader icon={MapPin} />

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
            Site-level sales and WiFi usage — revenue, sessions, and data transfer by location and
            capacity tier from daily stats and{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>. Manage sites in{" "}
            <Link href="/wifi/sites">Site Directory</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load site analytics"
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
              description="Choose a tenant to view site analytics."
            />
          ) : null}

          {orgId && stations.length === 0 && initDone && !loading ? (
            <Alert
              type="warning"
              showIcon
              title="No sites configured"
              description={
                <span>
                  Create WiFi sites in <Link href="/wifi/sites">Site Directory</Link> before
                  viewing analytics.
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
                      {scopedSite?.name ??
                        (stationSizeId
                          ? (stationSizes.find((t) => t.id === stationSizeId)?.name ?? "Tier overview")
                          : "All sites")}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag>{currency}</Tag>
                      {scopedSite ? (
                        <>
                          <Tag style={{ fontFamily: "monospace" }}>{scopedSite.code}</Tag>
                          <Tag color={STATION_STATUS_COLOR[scopedSite.status] ?? "default"}>
                            {scopedSite.status}
                          </Tag>
                          {"stationSizeName" in scopedSite && scopedSite.stationSizeName ? (
                            <Tag>{scopedSite.stationSizeName}</Tag>
                          ) : null}
                        </>
                      ) : stationSizeId ? (
                        <Tag color="purple">
                          {stationSizes.find((t) => t.id === stationSizeId)?.name ?? "Tier filter"}
                        </Tag>
                      ) : (
                        <Tag color="blue">
                          {analytics.summary.siteCount} site
                          {analytics.summary.siteCount === 1 ? "" : "s"}
                        </Tag>
                      )}
                      {stationId || stationSizeId ? (
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
                      Period revenue
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(analytics.summary.revenue, currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analytics.summary.ordersCount} order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                      {!singleSite
                        ? ` · ${analytics.summary.activeSiteCount} active site${
                            analytics.summary.activeSiteCount === 1 ? "" : "s"
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

              {!singleSite ? (
                <SitesFilterBar
                  stations={stations}
                  stationSizes={stationSizes}
                  stationId={stationId}
                  stationSizeId={stationSizeId}
                  loading={loading}
                  onStationChange={selectStation}
                  onStationSizeChange={selectStationSize}
                />
              ) : null}

              <SitesKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
                singleSite={singleSite}
              />

              <SitesTrendChart
                points={analytics.dailyTrend}
                currency={currency}
                loading={loading}
                showActiveSites={!singleSite}
              />

              {!singleSite ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <SitesTable
                      rows={analytics.bySite}
                      currency={currency}
                      loading={loading}
                      selectedStationId={stationId}
                      onSelectSite={(id) => selectStation(id)}
                    />
                  </Col>
                  <Col xs={24} lg={10}>
                    <SitesTierTable
                      rows={analytics.byTier}
                      currency={currency}
                      loading={loading}
                      selectedTierId={stationSizeId}
                      onSelectTier={(id) => selectStationSize(id)}
                    />
                  </Col>
                </Row>
              ) : null}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error && stations.length > 0 ? (
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

export default AnalyticsSitesPage;
