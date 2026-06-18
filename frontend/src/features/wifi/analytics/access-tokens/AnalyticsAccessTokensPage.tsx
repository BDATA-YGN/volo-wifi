"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { KeyRound, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsAccessTokens } from "./useAnalyticsAccessTokens";
import type { PeriodPreset } from "./types";
import { formatCredentialType } from "./utils";
import TokensToolbar from "./components/TokensToolbar";
import TokensFilterBar from "./components/TokensFilterBar";
import TokensKpiCards from "./components/TokensKpiCards";
import TokensLifecycleChart from "./components/TokensLifecycleChart";
import TokensStatusTable from "./components/TokensStatusTable";
import TokensPlanTable from "./components/TokensPlanTable";
import TokensTypeTable from "./components/TokensTypeTable";

const { Title, Paragraph, Text } = Typography;

const AnalyticsAccessTokensPage: React.FC = () => {
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
    credentialType,
    preset,
    formOptions,
    selectOrg,
    selectPlan,
    selectCredentialType,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsAccessTokens();

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
  const plans = formOptions.plans;
  const showOrgSwitcher = memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;

  const scopedPlan = useMemo(() => {
    if (!planId) return null;
    return plans.find((p) => p.id === planId) ?? null;
  }, [planId, plans]);

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
      <CommonHeader icon={KeyRound} />

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
            Access token lifecycle analytics — inventory, sold, activated, expired, revoked, and
            archived credentials from the{" "}
            <Link href="/wifi/commerce/access-tokens">Access Tokens</Link> ledger. Issue and manage
            tokens from commerce or{" "}
            <Link href="/wifi/access/voucher-runs">Voucher Runs</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load access token analytics"
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
              description="Choose a tenant to view access token analytics."
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
                      Credential lifecycle
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag color="blue">{analytics.summary.inventoryCount} in inventory</Tag>
                      <Tag color="success">{analytics.summary.activeCount} active pipeline</Tag>
                      {scopedPlan ? (
                        <Tag style={{ fontFamily: "monospace" }}>{scopedPlan.code}</Tag>
                      ) : null}
                      {credentialType ? (
                        <Tag>{formatCredentialType(credentialType)}</Tag>
                      ) : null}
                      {planId || credentialType ? (
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
                      Sold in period
                    </Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {analytics.summary.soldInPeriod}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analytics.summary.activatedInPeriod} activated ·{" "}
                      {analytics.summary.expiredInPeriod} expired ·{" "}
                      {analytics.summary.archivedInPeriod} archived
                    </Text>
                  </div>
                </div>
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <TokensToolbar
                  preset={preset}
                  customRange={customRange}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              <TokensFilterBar
                plans={plans}
                planId={planId}
                credentialType={credentialType}
                loading={loading}
                onPlanChange={selectPlan}
                onTypeChange={selectCredentialType}
              />

              <TokensKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                loading={loading}
              />

              <TokensLifecycleChart points={analytics.dailyTrend} loading={loading} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={10}>
                  <TokensStatusTable
                    rows={analytics.byStatus}
                    inventoryTotal={analytics.summary.inventoryCount}
                    loading={loading}
                  />
                </Col>
                <Col xs={24} lg={6}>
                  <TokensTypeTable rows={analytics.byType} loading={loading} />
                </Col>
                <Col xs={24} lg={8}>
                  <TokensPlanTable
                    rows={analytics.byPlan}
                    loading={loading}
                    selectedPlanId={planId}
                    onSelectPlan={(id) => selectPlan(id)}
                  />
                </Col>
              </Row>
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error ? (
            <Alert
              type="info"
              showIcon
              title="No credential data"
              description="There are no credentials or lifecycle events for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsAccessTokensPage;
