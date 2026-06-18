"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Scale, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsReconciliationSettlements } from "./useAnalyticsReconciliationSettlements";
import type { PeriodPreset, SettlementRow } from "./types";
import { STATUS_COLOR } from "./constant";
import { formatMoney, formatStatusLabel } from "./utils";
import SettlementsToolbar from "./components/SettlementsToolbar";
import SettlementsFilterBar from "./components/SettlementsFilterBar";
import SettlementsKpiCards from "./components/SettlementsKpiCards";
import SettlementsTrendChart from "./components/SettlementsTrendChart";
import SettlementsStatusTable from "./components/SettlementsStatusTable";
import SettlementsPartnerTable from "./components/SettlementsPartnerTable";
import SettlementsTable from "./components/SettlementsTable";
import SettlementDetailDrawer from "./components/SettlementDetailDrawer";

const { Title, Paragraph, Text } = Typography;

const AnalyticsReconciliationSettlementsPage: React.FC = () => {
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
  } = useAnalyticsReconciliationSettlements();

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

  const handleViewSettlement = async (row: SettlementRow) => {
    setDrawerOpen(true);
    await loadDetail(row.settlementId);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    clearDetail();
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Scale} />

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
            Cash reconciliation — partner-declared totals vs system-computed payments by site and
            tender type. Review attestations in{" "}
            <Link href="/wifi/analytics/reconciliation/approvals">Reconciliation Approvals</Link> or
            payment activity in{" "}
            <Link href="/wifi/commerce/transactions/payments">Payments</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load settlement analytics"
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
              description="Choose a tenant to view settlement reconciliation."
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
                      Cash reconciliation
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="blue">{analytics.summary.settlementCount} settlements</Tag>
                      <Tag color="warning">{analytics.summary.openCount} open</Tag>
                      {analytics.summary.withVarianceCount > 0 ? (
                        <Tag color="error">{analytics.summary.withVarianceCount} variance</Tag>
                      ) : null}
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
                      Net variance
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatMoney(analytics.summary.varianceTotal, currency)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatMoney(analytics.summary.systemTotal, currency)} system ·{" "}
                      {formatMoney(analytics.summary.declaredTotal, currency)} declared
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <SettlementsToolbar
                  preset={preset}
                  customRange={customRange}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <SettlementsFilterBar
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

              <SettlementsKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
              />

              <SettlementsTrendChart
                points={analytics.dailyTrend}
                currency={currency}
                loading={loading}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <SettlementsStatusTable
                    rows={analytics.byStatus}
                    currency={currency}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={16}>
                  <SettlementsPartnerTable
                    rows={analytics.byPartner}
                    currency={currency}
                    loading={loading}
                    selectedResellerId={resellerId}
                    onSelectPartner={(id) => selectReseller(id)}
                  />
                </Col>
              </Row>

              <SettlementsTable
                rows={analytics.settlements}
                currency={currency}
                loading={loading}
                onView={handleViewSettlement}
              />

              <SettlementDetailDrawer
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
              title="No settlements"
              description="There are no financial settlements for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReconciliationSettlementsPage;
