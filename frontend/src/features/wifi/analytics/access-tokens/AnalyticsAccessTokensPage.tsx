"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Tag, Typography, theme } from "antd";
import { KeyRound, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAnalyticsAccessTokens } from "./useAnalyticsAccessTokens";
import { formatCredentialType } from "./utils";
import TokensToolbar from "./components/TokensToolbar";
import TokensFilterBar from "./components/TokensFilterBar";
import TokensKpiCards from "./components/TokensKpiCards";
import TokensLifecycleChart from "./components/TokensLifecycleChart";
import TokensSiteTable from "./components/TokensSiteTable";
import TokensSitePlanModal from "./components/TokensSitePlanModal";
import type { CredentialSiteRow } from "./types";

const { Title, Paragraph, Text } = Typography;

const AnalyticsAccessTokensPage: React.FC = () => {
  const { token } = theme.useToken();
  const [initDone, setInitDone] = useState(false);
  const [selectedSite, setSelectedSite] = useState<CredentialSiteRow | null>(null);
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
    planId,
    credentialType,
    formOptions,
    selectOrg,
    selectPlan,
    selectCredentialType,
    selectCustomPeriod,
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

  useEffect(() => {
    setSelectedSite(null);
  }, [orgId, planId, credentialType, customRange]);

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
      <CommonHeader icon={KeyRound} />

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
                  customRange={customRange}
                  loading={loading}
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

              <TokensLifecycleChart
                points={analytics.dailyTrend}
                granularity={analytics.trendGranularity}
                loading={loading}
              />

              <TokensSiteTable
                rows={analytics.bySite ?? []}
                loading={loading}
                onSelectSite={setSelectedSite}
              />

              <TokensSitePlanModal
                open={Boolean(selectedSite)}
                site={selectedSite}
                onClose={() => setSelectedSite(null)}
              />
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
