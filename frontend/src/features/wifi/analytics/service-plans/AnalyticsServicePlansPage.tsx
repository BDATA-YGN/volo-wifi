"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Row, Tag, Typography, theme } from "antd";
import { Layers, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import { QUOTA_TYPE_COLOR } from "@/features/wifi/catalog/service-plans/constant";
import { formatQuotaTypeLabel } from "@/features/wifi/catalog/service-plans/utils";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";
import { useAnalyticsServicePlans } from "./useAnalyticsServicePlans";
import type { PeriodPreset } from "./types";
import PlansFilterBar from "./components/PlansFilterBar";
import PlansKpiCards from "./components/PlansKpiCards";
import PlansTrendChart from "./components/PlansTrendChart";
import PlansTable from "./components/PlansTable";
import PlansQuotaTypeTable from "./components/PlansQuotaTypeTable";
import { formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

const AnalyticsServicePlansPage: React.FC = () => {
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
    quotaType,
    preset,
    formOptions,
    selectOrg,
    selectPlan,
    selectQuotaType,
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
      <CommonHeader icon={Layers} />

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
            Service plan uptake and revenue — tokens sold, orders, commission, and WiFi usage by plan
            and quota type from daily stats and{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>. Configure plans in{" "}
            <Link href="/wifi/catalog/service-plans">Service Plans</Link>.
          </Paragraph>
        </div>

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

          {orgId && plans.length === 0 && initDone && !loading ? (
            <Alert
              type="warning"
              showIcon
              title="No service plans configured"
              description={
                <span>
                  Create WiFi service plans in{" "}
                  <Link href="/wifi/catalog/service-plans">Service Plans</Link> before viewing
                  analytics.
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
                      {scopedPlan?.name ??
                        (quotaType
                          ? formatQuotaTypeLabel(quotaType)
                          : "All service plans")}
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
                          <Tag color={QUOTA_TYPE_COLOR[scopedPlan.quotaType as PlanQuotaType]}>
                            {formatQuotaTypeLabel(scopedPlan.quotaType as PlanQuotaType)}
                          </Tag>
                          <Tag color={scopedPlan.isActive ? "success" : "default"}>
                            {scopedPlan.isActive ? "Active" : "Inactive"}
                          </Tag>
                        </>
                      ) : quotaType ? (
                        <Tag color={QUOTA_TYPE_COLOR[quotaType]}>
                          {formatQuotaTypeLabel(quotaType)}
                        </Tag>
                      ) : (
                        <Tag color="blue">
                          {analytics.summary.planCount} plan
                          {analytics.summary.planCount === 1 ? "" : "s"}
                        </Tag>
                      )}
                      {planId || quotaType ? (
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

              {!singlePlan ? (
                <PlansFilterBar
                  plans={plans}
                  planId={planId}
                  quotaType={quotaType}
                  loading={loading}
                  onPlanChange={selectPlan}
                  onQuotaTypeChange={selectQuotaType}
                />
              ) : null}

              <PlansKpiCards
                summary={analytics.summary}
                previous={analytics.previousSummary}
                currency={currency}
                loading={loading}
                singlePlan={singlePlan}
              />

              <PlansTrendChart
                points={analytics.dailyTrend}
                currency={currency}
                loading={loading}
                showActivePlans={!singlePlan}
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
                      rows={analytics.byQuotaType}
                      currency={currency}
                      loading={loading}
                      selectedQuotaType={quotaType}
                      onSelectQuotaType={(type) => selectQuotaType(type)}
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
              description="There is no sales or usage activity for the selected period and filters."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsServicePlansPage;
