"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { ClipboardCheck, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsReconciliationApprovals } from "./useAnalyticsReconciliationApprovals";
import type { ApprovalQueueRow, PeriodPreset } from "./types";
import { STATUS_COLOR } from "./constant";
import { formatStatusLabel } from "./utils";
import ApprovalsToolbar from "./components/ApprovalsToolbar";
import ApprovalsFilterBar from "./components/ApprovalsFilterBar";
import ApprovalsKpiCards from "./components/ApprovalsKpiCards";
import ApprovalsTrendChart from "./components/ApprovalsTrendChart";
import ApprovalsWorkflowTable from "./components/ApprovalsWorkflowTable";
import ApprovalsAttestationKindTable from "./components/ApprovalsAttestationKindTable";
import ApprovalQueueTable from "./components/ApprovalQueueTable";
import AttestationsTable from "./components/AttestationsTable";
import PostingsTable from "./components/PostingsTable";
import ApprovalDetailDrawer from "./components/ApprovalDetailDrawer";

const { Title, Paragraph, Text } = Typography;

const AnalyticsReconciliationApprovalsPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    status,
    preset,
    formOptions,
    selectedDetail,
    detailLoading,
    selectOrg,
    selectStation,
    selectReseller,
    selectStatus,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    loadDetail,
    clearDetail,
    refresh,
    loadFormOptions,
  } = useAnalyticsReconciliationApprovals();

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

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const hasFilters = Boolean(stationId || resellerId || status);
  const pendingTotal = analytics
    ? analytics.summary.pendingStationCount +
      analytics.summary.pendingOrgCount +
      analytics.summary.readyToPostCount
    : 0;

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

  const handleViewSettlement = async (row: ApprovalQueueRow | { settlementId: string }) => {
    setDrawerOpen(true);
    await loadDetail(row.settlementId);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    clearDetail();
  };

  return (
    <div className="p-0">
      <CommonHeader icon={ClipboardCheck} />

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
            Attestation workflow — track station sign-offs, organization approvals, and sealed
            postings across settlement periods. Review cash totals in{" "}
            <Link href="/wifi/analytics/reconciliation/settlements">Settlements</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load reconciliation approvals"
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
              description="Choose a tenant to view reconciliation approvals."
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
                      Reconciliation approvals
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="warning">{pendingTotal} in queue</Tag>
                      <Tag color="blue">{analytics.summary.attestationsSigned} signed</Tag>
                      <Tag color="purple">{analytics.summary.postingsSealed} posted</Tag>
                      {status ? (
                        <Tag color={STATUS_COLOR[status]}>{formatStatusLabel(status)}</Tag>
                      ) : null}
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
                      Workflow health
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analytics.summary.postedCount} / {analytics.summary.settlementCount}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      posted settlements in period
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <ApprovalsToolbar
                  preset={preset}
                  customRange={customRange}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <ApprovalsFilterBar
                stations={stations}
                resellers={resellers}
                stationId={stationId}
                resellerId={resellerId}
                status={status}
                loading={loading}
                onStationChange={selectStation}
                onResellerChange={selectReseller}
                onStatusChange={selectStatus}
              />

              <ApprovalsKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                loading={loading}
              />

              <ApprovalsTrendChart points={analytics.dailyTrend} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                  <ApprovalsWorkflowTable rows={analytics.byWorkflow} loading={loading} />
                </Col>
                <Col xs={24} lg={14}>
                  <ApprovalsAttestationKindTable
                    rows={analytics.byAttestationKind}
                    loading={loading}
                  />
                </Col>
              </Row>

              <ApprovalQueueTable
                rows={analytics.approvalQueue}
                currency={currency}
                loading={loading}
                onView={handleViewSettlement}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <AttestationsTable
                    rows={analytics.attestations}
                    loading={loading}
                    onViewSettlement={(id) => void handleViewSettlement({ settlementId: id })}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <PostingsTable
                    rows={analytics.postings}
                    loading={loading}
                    onViewSettlement={(id) => void handleViewSettlement({ settlementId: id })}
                  />
                </Col>
              </Row>

              <ApprovalDetailDrawer
                open={drawerOpen}
                loading={detailLoading}
                detail={selectedDetail}
                currency={currency}
                onClose={handleCloseDrawer}
              />
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No approval activity"
              description="There are no settlements or attestation events for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReconciliationApprovalsPage;
