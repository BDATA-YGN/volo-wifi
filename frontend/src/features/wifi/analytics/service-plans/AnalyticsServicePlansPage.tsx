"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Layers, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import { useAnalyticsServicePlans } from "./useAnalyticsServicePlans";
import type { PeriodPreset } from "./types";
import PlansFilterBar from "./components/PlansFilterBar";
import PlansKpiCards from "./components/PlansKpiCards";
import PlansTrendChart from "./components/PlansTrendChart";
import PlansTable from "./components/PlansTable";
import PlansQuotaTypeTable from "./components/PlansQuotaTypeTable";
import { formatMoney } from "./utils";
import { dateRangePresets } from "./constant";

const { Title, Paragraph, Text } = Typography;

const AnalyticsServicePlansPage: React.FC = () => {
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
    resellerId,
    profile,
    planId,
    preset,
    formOptions,
    selectOrg,
    selectStation,
    selectReseller,
    selectProfile,
    selectPlan,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsServicePlans();

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
  const resellers = formOptions.resellers;
  const profiles =
    formOptions.profiles && formOptions.profiles.length > 0
      ? formOptions.profiles
      : [
          { value: "MikroTik", label: "MikroTik" },
          { value: "Ruijie", label: "Ruijie" },
        ];
  const plans = formOptions.plans;
  const showOrgSwitcher =
    memberships.length > 1 ||
    Boolean(meta?.requiresOrgSelection || formOptions.requiresOrgSelection);
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const currency = analytics?.org.currency ?? formOptions.currency;
  const singlePlan = Boolean(planId);

  const scopedPlan = useMemo(() => {
    if (!planId) return null;
    return (
      analytics?.byPlan.find((p) => p.planId === planId) ??
      plans.find((p) => p.id === planId) ??
      null
    );
  }, [planId, analytics?.byPlan, plans]);

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const handlePresetChange = (value: string) => {
    setCustomRange(null);
    clearCustomPeriod();
    selectPreset(value as PeriodPreset);
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
      <CommonHeader icon={Layers} />

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
            title="Failed to load plan analytics"
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
              description="Choose a tenant to view plan analytics."
            />
          ) : null}

          {analytics ? (
            <>
              <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: token.borderRadiusLG }}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {scopedPlan?.name ??
                        (profile ? profile : "All service plans")}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                      {analytics.org.name}
                      {periodLabel ? ` · ${periodLabel}` : ""}
                    </Paragraph>
                    <div className="flex flex-wrap gap-2">
                      <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                      <Tag>{currency}</Tag>
                      {scopedPlan ? (
                        <>
                          <Tag style={{ fontFamily: "monospace" }}>{scopedPlan.code}</Tag>
                          <Tag color={scopedPlan.isActive ? "success" : "default"}>
                            {scopedPlan.isActive ? "Active" : "Inactive"}
                          </Tag>
                        </>
                      ) : profile ? (
                        <Tag color="processing">{profile}</Tag>
                      ) : (
                        <Tag color="blue">
                          {analytics.summary.planCount} plan
                          {analytics.summary.planCount === 1 ? "" : "s"}
                        </Tag>
                      )}
                      {stationId || resellerId || planId || profile ? (
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
                      {analytics.summary.itemsCount} token
                      {analytics.summary.itemsCount === 1 ? "" : "s"} sold ·{" "}
                      {analytics.summary.ordersCount} order
                      {analytics.summary.ordersCount === 1 ? "" : "s"}
                      {!singlePlan
                        ? ` · ${analytics.summary.activePlanCount} active plan${
                            analytics.summary.activePlanCount === 1 ? "" : "s"
                          }`
                        : ""}
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                  }}
                >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  {!singlePlan ? (
                    <div className="min-w-0">
                      <PlansFilterBar
                        stations={stations}
                        resellers={resellers}
                        profiles={profiles}
                        plans={plans}
                        stationId={stationId}
                        resellerId={resellerId}
                        profile={profile}
                        planId={planId}
                        loading={loading}
                        onStationChange={selectStation}
                        onResellerChange={selectReseller}
                        onProfileChange={selectProfile}
                        onPlanChange={selectPlan}
                      />
                    </div>
                  ) : <div />}

                  <div style={{ minWidth: 320 }}>
                    <InsightsToolbar
                      preset={preset}
                      customRange={customRange}
                      dataSource={analytics.dataSource}
                      loading={loading}
                      showPresets={false}
                      datePresets={dateRangePresets()}
                      onPresetChange={handlePresetChange}
                      onCustomRangeChange={handleCustomRangeChange}
                      onRefresh={refresh}
                    />
                  </div>
                </div>
                </div>
              </Card>

              <PlansKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
                singlePlan={singlePlan}
              />

              <PlansTrendChart
                series={analytics.trendByPlan}
                granularity={analytics.trendGranularity}
                currency={currency}
                loading={loading}
              />

              {!singlePlan ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <PlansTable
                      rows={analytics.byPlan}
                      currency={currency}
                      loading={loading}
                      selectedPlanId={planId}
                      onSelectPlan={(id) => selectPlan(id)}
                    />
                  </Col>
                  <Col xs={24} lg={10}>
                    <PlansQuotaTypeTable
                      rows={analytics.byTier}
                      currency={currency}
                      loading={loading}
                    />
                  </Col>
                </Row>
              ) : null}
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error && plans.length > 0 ? (
            <Alert
              type="info"
              showIcon
              title="No analytics data"
              description="There is no sales activity in daily stats for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsServicePlansPage;
