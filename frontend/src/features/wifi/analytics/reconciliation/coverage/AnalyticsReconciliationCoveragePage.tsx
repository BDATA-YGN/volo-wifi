"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Row, Segmented, Tag, Typography, theme } from "antd";
import { Archive, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsReconciliationCoverage } from "./useAnalyticsReconciliationCoverage";
import type { CoverageScopeRow, CoverageTab, EligibilityStatus } from "./types";
import { COVERAGE_TABS, ELIGIBILITY_COLOR } from "./constant";
import { formatCount, formatEligibility, formatPercent } from "./utils";
import CoverageToolbar from "./components/CoverageToolbar";
import CoverageFilterBar from "./components/CoverageFilterBar";
import CoverageKpiCards from "./components/CoverageKpiCards";
import CoverageLagChart from "./components/CoverageLagChart";
import CoverageEligibilityTable from "./components/CoverageEligibilityTable";
import CoveragePartnerTable from "./components/CoveragePartnerTable";
import CoverageSiteTable from "./components/CoverageSiteTable";
import CoverageScopesTable from "./components/CoverageScopesTable";
import CoverageDetailDrawer from "./components/CoverageDetailDrawer";

const { Title, Paragraph, Text } = Typography;

const AnalyticsReconciliationCoveragePage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    eligibility,
    tab,
    formOptions,
    selectedDetail,
    detailLoading,
    selectOrg,
    selectStation,
    selectReseller,
    selectEligibility,
    toggleEligibility,
    selectTab,
    clearFilters,
    loadDetail,
    clearDetail,
    refresh,
    loadFormOptions,
  } = useAnalyticsReconciliationCoverage();

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
  const resellers = formOptions.resellers;
  const showOrgSwitcher =
    memberships.length > 1 ||
    Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection);
  const needsOrg = Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? "MMK";
  const hasFilters = Boolean(stationId || resellerId || eligibility);

  const horizonLabel = analytics?.summary.latestCoveredAt
    ? dayjs(analytics.summary.latestCoveredAt).format("D MMM YYYY, HH:mm")
    : null;
  const atRisk = analytics
    ? (analytics.summary.atRiskCount ??
      analytics.summary.gapCount + analytics.summary.unsealedCount + analytics.summary.noCoverageCount)
    : 0;
  const sealedPctValue = analytics?.summary.sealedPct ?? 0;

  const drillEligibility = (status: EligibilityStatus | undefined) => {
    if (!status) {
      selectEligibility(undefined);
      return;
    }
    toggleEligibility(status);
    selectTab("ledger");
  };

  const handleViewScope = async (row: CoverageScopeRow) => {
    if (!row.coverageId) return;
    setDrawerOpen(true);
    await loadDetail(row.coverageId);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    clearDetail();
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Archive} />

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
            title="Failed to load data coverage"
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
              description="Choose a tenant to view reconciliation data coverage."
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
                      Data coverage
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {horizonLabel ? ` · sealed through ${horizonLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="success">{formatPercent(sealedPctValue)} sealed</Tag>
                      <Tag>{formatCount(analytics.summary.scopeCount)} scopes</Tag>
                      {atRisk > 0 ? (
                        <Tag color="warning">{formatCount(atRisk)} at risk</Tag>
                      ) : (
                        <Tag color="success">All sealed</Tag>
                      )}
                      {eligibility ? (
                        <Tag color={ELIGIBILITY_COLOR[eligibility]}>
                          {formatEligibility(eligibility)}
                        </Tag>
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
                      Uncovered payments
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {formatCount(analytics.summary.totalUncoveredPayments)}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      After the sealed payment horizon
                    </Text>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 14 }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <CoverageFilterBar
                      stations={stations}
                      resellers={resellers}
                      stationId={stationId}
                      resellerId={resellerId}
                      eligibility={eligibility}
                      loading={loading}
                      onStationChange={selectStation}
                      onResellerChange={selectReseller}
                      onEligibilityChange={selectEligibility}
                    />
                    <CoverageToolbar
                      generatedAt={analytics.generatedAt}
                      loading={loading}
                      onRefresh={refresh}
                    />
                  </div>
                </div>
              </Card>

              <Segmented
                value={tab}
                options={COVERAGE_TABS.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                onChange={(value) => selectTab(value as CoverageTab)}
              />

              {tab === "stats" ? (
                <div className="flex flex-col gap-4">
                  <CoverageKpiCards
                    summary={analytics.summary}
                    loading={loading}
                    selectedEligibility={eligibility}
                    onSelectEligibility={drillEligibility}
                  />
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                      <CoverageEligibilityTable
                        rows={analytics.byEligibility}
                        loading={loading}
                        selectedEligibility={eligibility}
                        onSelectEligibility={drillEligibility}
                      />
                    </Col>
                    <Col xs={24} lg={16}>
                      <CoverageLagChart
                        buckets={analytics.lagBuckets}
                        loading={loading}
                        selectedEligibility={eligibility}
                        onSelectBucket={drillEligibility}
                      />
                    </Col>
                  </Row>
                </div>
              ) : null}

              {tab === "sites" ? (
                <CoverageSiteTable
                  rows={analytics.bySite}
                  loading={loading}
                  selectedStationId={stationId}
                  onSelectSite={(id) => selectStation(id)}
                />
              ) : null}

              {tab === "partners" ? (
                <CoveragePartnerTable
                  rows={analytics.byPartner}
                  loading={loading}
                  selectedResellerId={resellerId}
                  onSelectPartner={(id) => selectReseller(id)}
                />
              ) : null}

              {tab === "ledger" ? (
                <CoverageScopesTable
                  rows={analytics.scopes}
                  loading={loading}
                  onView={handleViewScope}
                />
              ) : null}

              <CoverageDetailDrawer
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
              title="No coverage data"
              description="There are no source coverage records or payment scopes for this organization."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReconciliationCoveragePage;
