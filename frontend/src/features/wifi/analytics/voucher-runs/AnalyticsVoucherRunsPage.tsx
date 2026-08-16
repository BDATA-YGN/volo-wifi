"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Ticket, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsVoucherRuns } from "./useAnalyticsVoucherRuns";
import type { PeriodPreset } from "./types";
import RunsToolbar from "./components/RunsToolbar";
import RunsFilterBar from "./components/RunsFilterBar";
import RunsKpiCards from "./components/RunsKpiCards";
import RunsTrendChart from "./components/RunsTrendChart";
import RunsBatchTable from "./components/RunsBatchTable";
import RunsPlanTable from "./components/RunsPlanTable";
import RunsStatusTable from "./components/RunsStatusTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsVoucherRunsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    planId,
    stationId,
    batchId,
    preset,
    formOptions,
    selectOrg,
    selectPlan,
    selectStation,
    selectBatch,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsVoucherRuns();

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
  const plans = formOptions.plans;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const scopedBatch = useMemo(() => {
    if (!batchId) return null;
    return analytics?.byBatch.find((b) => b.batchId === batchId) ?? null;
  }, [batchId, analytics?.byBatch]);

  const scopedPlan = useMemo(() => {
    if (!planId) return null;
    return plans.find((p) => p.id === planId) ?? null;
  }, [planId, plans]);

  const scopedSite = useMemo(() => {
    if (!stationId) return null;
    return stations.find((s) => s.id === stationId) ?? null;
  }, [stationId, stations]);

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const statusTotal = useMemo(
    () => analytics?.byStatus.reduce((sum, row) => sum + row.count, 0) ?? 0,
    [analytics?.byStatus]
  );

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
      <CommonHeader icon={Ticket} />

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
            title="Failed to load voucher run analytics"
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
              description="Choose a tenant to view voucher run analytics."
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
                      Batch utilization
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="blue">{analytics.summary.batchCount} runs</Tag>
                      <Tag color="success">{analytics.summary.utilizationPercent}% utilized</Tag>
                      {scopedBatch ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedBatch.batchNo}</Tag>
                      ) : null}
                      {scopedSite ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedSite.code}</Tag>
                      ) : null}
                      {scopedPlan ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedPlan.code}</Tag>
                      ) : null}
                      {stationId || planId || batchId ? (
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
                      Vouchers issued
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analytics.summary.totalIssued.toLocaleString()}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analytics.summary.totalRedeemed} redeemed ·{" "}
                      {analytics.summary.totalRemaining} remaining
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RunsToolbar
                  preset={preset}
                  customRange={customRange}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <RunsFilterBar
                stations={stations}
                plans={plans}
                stationId={stationId}
                planId={planId}
                loading={loading}
                onStationChange={selectStation}
                onPlanChange={selectPlan}
              />

              <RunsKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                loading={loading}
              />

              <RunsTrendChart points={analytics.dailyTrend} loading={loading} />

              <RunsBatchTable
                rows={analytics.byBatch}
                loading={loading}
                selectedBatchId={batchId}
                onSelectBatch={(id) => selectBatch(id)}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <RunsPlanTable
                    rows={analytics.byPlan}
                    loading={loading}
                    selectedPlanId={planId}
                    onSelectPlan={(id) => selectPlan(id)}
                  />
                </Col>
                <Col xs={24} lg={10}>
                  <RunsStatusTable
                    rows={analytics.byStatus}
                    total={statusTotal}
                    loading={loading}
                  />
                </Col>
              </Row>
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No voucher runs"
              description="There are no voucher batches created in the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsVoucherRunsPage;
