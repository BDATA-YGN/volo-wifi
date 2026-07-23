"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Archive, X } from "lucide-react";
import dayjs from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsReconciliationCoverage } from "./useAnalyticsReconciliationCoverage";
import type { CoverageScopeRow } from "./types";
import { ELIGIBILITY_COLOR } from "./constant";
import { formatEligibility } from "./utils";
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
    formOptions,
    selectedDetail,
    detailLoading,
    selectOrg,
    selectStation,
    selectReseller,
    selectEligibility,
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

  const hasFilters = Boolean(stationId || resellerId || eligibility);

  const horizonLabel = useMemo(() => {
    if (!analytics?.summary.latestCoveredAt) return null;
    return dayjs(analytics.summary.latestCoveredAt).format("D MMM YYYY, HH:mm");
  }, [analytics?.summary.latestCoveredAt]);

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
        <div className="mb-5 max-w-3xl">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Sealed period coverage — how far partner-site payment data is covered by postings and
            eligible for purge. Review workflow in{" "}
            <Link href="/wifi/analytics/reconciliation/approvals">Reconciliation Approvals</Link>{" "}
            or cash totals in{" "}
            <Link href="/wifi/analytics/reconciliation/settlements">Settlements</Link>.
          </Paragraph>
        </div>

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
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="success">{analytics.summary.purgeEligibleCount} purge eligible</Tag>
                      {analytics.summary.gapCount > 0 ? (
                        <Tag color="warning">{analytics.summary.gapCount} gaps</Tag>
                      ) : null}
                      {analytics.summary.noCoverageCount > 0 ? (
                        <Tag color="error">{analytics.summary.noCoverageCount} missing records</Tag>
                      ) : null}
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
                      Sealed horizon
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {horizonLabel ?? "—"}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Latest max covered paid at across scopes
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <CoverageToolbar
                  generatedAt={analytics.generatedAt}
                  loading={loading}
                  onRefresh={refresh}
                />
              </Card>

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

              <CoverageKpiCards summary={analytics.summary} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <CoverageEligibilityTable
                    rows={analytics.byEligibility}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={16}>
                  <CoverageLagChart buckets={analytics.lagBuckets} loading={loading} />
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <CoveragePartnerTable
                    rows={analytics.byPartner}
                    loading={loading}
                    selectedResellerId={resellerId}
                    onSelectPartner={(id) => selectReseller(id)}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <CoverageSiteTable
                    rows={analytics.bySite}
                    loading={loading}
                    selectedStationId={stationId}
                    onSelectSite={(id) => selectStation(id)}
                  />
                </Col>
              </Row>

              <CoverageScopesTable
                rows={analytics.scopes}
                loading={loading}
                onView={handleViewScope}
              />

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
