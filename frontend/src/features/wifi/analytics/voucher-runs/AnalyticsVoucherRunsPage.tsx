"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Ticket, X } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsVoucherRuns } from "./useAnalyticsVoucherRuns";
import { formatMonthLabel } from "./constant";
import RunsToolbar from "./components/RunsToolbar";
import RunsKpiCards from "./components/RunsKpiCards";
import RunsTrendChart from "./components/RunsTrendChart";
import RunsBatchTable from "./components/RunsBatchTable";
import RunsPlanTable from "./components/RunsPlanTable";
import RunsStatusTable from "./components/RunsStatusTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsVoucherRunsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    planId,
    stationId,
    batchId,
    month,
    formOptions,
    selectOrg,
    selectPlan,
    selectStation,
    selectBatch,
    selectMonth,
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
  const periodLabel = formatMonthLabel(month);

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

  const statusTotal = useMemo(
    () => analytics?.byStatus.reduce((sum, row) => sum + row.count, 0) ?? 0,
    [analytics?.byStatus]
  );

  const showContent = Boolean(orgId) && !needsOrg;

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

          {showContent ? (
            <>
              {analytics ? (
                <Card
                  styles={{ body: { padding: 20 } }}
                  style={{ borderRadius: token.borderRadiusLG }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        Voucher run analytics
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
              ) : null}

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RunsToolbar
                  month={month}
                  stations={stations}
                  plans={plans}
                  stationId={stationId}
                  planId={planId}
                  loading={loading}
                  onMonthChange={selectMonth}
                  onStationChange={selectStation}
                  onPlanChange={selectPlan}
                  onRefresh={refresh}
                />
              </Card>

              {analytics ? (
                <>
                  <RunsKpiCards
                    summary={analytics.summary}
                    previous={analytics.previousSummary}
                    loading={loading}
                  />

                  <RunsTrendChart
                    points={analytics.dailyTrend}
                    granularity={analytics.trendGranularity}
                    loading={loading}
                  />

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14}>
                      <RunsBatchTable
                        rows={analytics.byBatch}
                        loading={loading}
                        selectedBatchId={batchId}
                        onSelectBatch={(id) => selectBatch(id)}
                      />
                    </Col>
                    <Col xs={24} lg={10}>
                      <div className="flex flex-col gap-4">
                        <RunsPlanTable
                          rows={analytics.byPlan}
                          loading={loading}
                          selectedPlanId={planId}
                          onSelectPlan={(id) => selectPlan(id)}
                        />
                        <RunsStatusTable
                          rows={analytics.byStatus}
                          total={statusTotal}
                          loading={loading}
                        />
                      </div>
                    </Col>
                  </Row>
                </>
              ) : initDone && !loading && !error ? (
                <Alert
                  type="info"
                  showIcon
                  title="No voucher runs"
                  description="There are no voucher batches created in the selected month and filters."
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsVoucherRunsPage;
