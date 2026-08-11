"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Tabs, Tag, Typography, theme } from "antd";
import { MapPin, X } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import InsightsToolbar from "@/features/wifi/commerce/partners/insights/components/InsightsToolbar";
import {
  needsOrgSelection,
  shouldShowOrgSwitcher,
} from "@/features/wifi/shared/hooks/useWifiOrgScope";
import { useAnalyticsSites } from "./useAnalyticsSites";
import type { PeriodPreset, SiteAnalyticsTab } from "./types";
import {
  DEFAULT_SITES_PAGE,
  DEFAULT_SITES_PAGE_SIZE,
  DEFAULT_TAB,
  PERIOD_PRESETS,
  SITE_ANALYTICS_TABS,
} from "./constant";
import SitesFilterBar from "./components/SitesFilterBar";
import SitesKpiCards from "./components/SitesKpiCards";
import SitesTrendChart from "./components/SitesTrendChart";
import SitesTable from "./components/SitesTable";
import SitesTierTable from "./components/SitesTierTable";
import { STATION_STATUS_COLOR, formatMoney } from "./utils";

const { Title, Paragraph, Text } = Typography;

function parseTab(value: string | null): SiteAnalyticsTab {
  if (value === "sites" || value === "tiers" || value === "stats") return value;
  return DEFAULT_TAB;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

const AnalyticsSitesPage: React.FC = () => {
  const { token } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = parseTab(searchParams.get("tab"));
  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_SITES_PAGE);
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_SITES_PAGE_SIZE);

  const [initDone, setInitDone] = useState(false);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const replaceParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setTab = useCallback(
    (nextTab: string) => {
      const parsed = parseTab(nextTab);
      replaceParams({
        tab: parsed,
        page: parsed === "sites" ? String(DEFAULT_SITES_PAGE) : null,
        pageSize: parsed === "sites" ? String(DEFAULT_SITES_PAGE_SIZE) : null,
      });
    },
    [replaceParams]
  );

  const setSitesPagination = useCallback(
    (nextPage: number, nextPageSize: number) => {
      replaceParams({
        tab: "sites",
        page: String(nextPage),
        pageSize: String(nextPageSize),
      });
    },
    [replaceParams]
  );

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    preset,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  } = useAnalyticsSites({ tab, page, pageSize });

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (!initDone || orgId) return;
    const canSwitch = meta?.canSwitchOrg ?? formOptions.canSwitchOrg;
    const requires = meta?.requiresOrgSelection ?? formOptions.requiresOrgSelection;
    if (canSwitch || requires) return;
    if ((meta?.memberships ?? formOptions.memberships).length === 1) {
      selectOrg((meta?.memberships ?? formOptions.memberships)[0].id);
    }
  }, [
    initDone,
    meta?.memberships,
    meta?.requiresOrgSelection,
    meta?.canSwitchOrg,
    formOptions.memberships,
    formOptions.canSwitchOrg,
    formOptions.requiresOrgSelection,
    orgId,
    selectOrg,
  ]);

  useEffect(() => {
    const canSwitch = meta?.canSwitchOrg ?? formOptions.canSwitchOrg;
    if (canSwitch) return;
    if (meta?.orgId && !orgId) {
      selectOrg(meta.orgId);
    }
  }, [meta?.orgId, meta?.canSwitchOrg, formOptions.canSwitchOrg, orgId, selectOrg]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      replaceParams({ tab: DEFAULT_TAB });
    }
  }, [replaceParams, searchParams]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const stations = formOptions.stations;
  const stationSizes = formOptions.stationSizes;
  const orgScopeMeta = {
    canSwitchOrg: meta?.canSwitchOrg ?? formOptions.canSwitchOrg,
    requiresOrgSelection: meta?.requiresOrgSelection ?? formOptions.requiresOrgSelection,
  };
  const showOrgSwitcher = shouldShowOrgSwitcher(memberships, orgScopeMeta);
  const needsOrg = needsOrgSelection(orgId, orgScopeMeta, memberships.length);
  const currency = analytics?.org.currency ?? formOptions.currency;
  const singleSite = Boolean(stationId);

  const scopedSite = useMemo(() => {
    if (!stationId) return null;
    return (
      analytics?.bySite.find((s) => s.stationId === stationId) ??
      stations.find((s) => s.id === stationId) ??
      null
    );
  }, [stationId, analytics?.bySite, stations]);

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const handlePresetChange = (value: string) => {
    setCustomRange(null);
    clearCustomPeriod();
    selectPreset(value as PeriodPreset);
    if (tab === "sites") {
      replaceParams({ page: String(DEFAULT_SITES_PAGE) });
    }
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
    if (tab === "sites") {
      replaceParams({ page: String(DEFAULT_SITES_PAGE) });
    }
  };

  const sitesTotal = analytics?.pagination?.total ?? analytics?.bySite?.length ?? 0;

  return (
    <div className="p-0">
      <CommonHeader icon={MapPin} />

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
            Site-level sales and WiFi usage — revenue, sessions, and data transfer by location and
            capacity tier from daily stats and{" "}
            <Link href="/wifi/commerce/transactions/orders">Orders</Link>. Manage sites in{" "}
            <Link href="/wifi/sites">Site Directory</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load site analytics"
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
              description="Choose a tenant to view site analytics."
            />
          ) : null}

          {orgId &&
          stations.length === 0 &&
          !analytics?.bySite?.length &&
          initDone &&
          !loading &&
          !needsOrg ? (
            <Alert
              type="warning"
              showIcon
              title="No sites configured"
              description={
                <span>
                  Create WiFi sites in <Link href="/wifi/sites">Site Directory</Link> before
                  viewing analytics.
                </span>
              }
            />
          ) : null}

          {orgId && !needsOrg ? (
            <>
              {analytics ? (
                <Card
                  styles={{ body: { padding: 20 } }}
                  style={{ borderRadius: token.borderRadiusLG }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {scopedSite?.name ??
                          (stationSizeId
                            ? (stationSizes.find((t) => t.id === stationSizeId)?.name ??
                              "Tier overview")
                            : "All sites")}
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
                        {analytics.org.name}
                        {periodLabel ? ` · ${periodLabel}` : ""}
                      </Paragraph>
                      <div className="flex flex-wrap gap-2">
                        <Tag style={{ fontFamily: "monospace" }}>{analytics.org.code}</Tag>
                        <Tag>{currency}</Tag>
                        {scopedSite ? (
                          <>
                            <Tag style={{ fontFamily: "monospace" }}>{scopedSite.code}</Tag>
                            <Tag color={STATION_STATUS_COLOR[scopedSite.status] ?? "default"}>
                              {scopedSite.status}
                            </Tag>
                            {"stationSizeName" in scopedSite && scopedSite.stationSizeName ? (
                              <Tag>{scopedSite.stationSizeName}</Tag>
                            ) : null}
                          </>
                        ) : stationSizeId ? (
                          <Tag color="purple">
                            {stationSizes.find((t) => t.id === stationSizeId)?.name ??
                              "Tier filter"}
                          </Tag>
                        ) : (
                          <Tag color="blue">
                            {analytics.summary.siteCount} site
                            {analytics.summary.siteCount === 1 ? "" : "s"}
                          </Tag>
                        )}
                        {stationId || stationSizeId ? (
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
                        {analytics.summary.ordersCount} order
                        {analytics.summary.ordersCount === 1 ? "" : "s"}
                        {!singleSite
                          ? ` · ${analytics.summary.activeSiteCount} active site${
                              analytics.summary.activeSiteCount === 1 ? "" : "s"
                            }`
                          : ""}
                      </Text>
                    </div>
                  </div>
                </Card>
              ) : null}

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <InsightsToolbar
                  preset={preset}
                  presets={PERIOD_PRESETS}
                  customRange={customRange}
                  dataSource={analytics?.dataSource}
                  loading={loading}
                  onPresetChange={handlePresetChange}
                  onCustomRangeChange={handleCustomRangeChange}
                  onRefresh={refresh}
                />
              </Card>

              {!singleSite ? (
                <SitesFilterBar
                  stations={stations}
                  stationSizes={stationSizes}
                  stationId={stationId}
                  stationSizeId={stationSizeId}
                  loading={loading}
                  onStationChange={(id) => {
                    selectStation(id);
                    if (tab === "sites") replaceParams({ page: String(DEFAULT_SITES_PAGE) });
                  }}
                  onStationSizeChange={(id) => {
                    selectStationSize(id);
                    if (tab === "sites") replaceParams({ page: String(DEFAULT_SITES_PAGE) });
                  }}
                />
              ) : null}

              <Tabs
                activeKey={tab}
                onChange={setTab}
                destroyOnHidden
                items={SITE_ANALYTICS_TABS.map((item) => ({
                  key: item.key,
                  label: item.label,
                  children:
                    item.key === "stats" ? (
                      analytics && tab === "stats" ? (
                        <div className="flex flex-col gap-4 pt-2">
                          <SitesKpiCards
                            summary={analytics.summary}
                            previous={analytics.previousSummary}
                            currency={currency}
                            loading={loading}
                            singleSite={singleSite}
                          />
                          <SitesTrendChart
                            points={analytics.dailyTrend}
                            currency={currency}
                            loading={loading}
                            showActiveSites={!singleSite}
                          />
                        </div>
                      ) : loading ? (
                        <Card loading style={{ marginTop: 8 }} />
                      ) : (
                        <Alert
                          className="mt-2"
                          type="info"
                          showIcon
                          title="No analytics data"
                          description="There is no sales or usage activity for the selected period and filters."
                        />
                      )
                    ) : item.key === "sites" ? (
                      analytics && tab === "sites" ? (
                        <div className="pt-2">
                          <SitesTable
                            rows={analytics.bySite}
                            plans={analytics.plans ?? []}
                            planTotals={analytics.planTotals ?? []}
                            currency={currency}
                            loading={loading}
                            page={analytics.pagination?.page ?? page}
                            pageSize={analytics.pagination?.limit ?? pageSize}
                            total={sitesTotal}
                            onPageChange={setSitesPagination}
                            selectedStationId={stationId}
                            onSelectSite={(id) => selectStation(id)}
                          />
                        </div>
                      ) : loading ? (
                        <Card loading style={{ marginTop: 8 }} />
                      ) : (
                        <Alert
                          className="mt-2"
                          type="info"
                          showIcon
                          title="No site performance data"
                          description="There is no site sales activity for the selected period and filters."
                        />
                      )
                    ) : analytics && tab === "tiers" ? (
                      <div className="pt-2">
                        <SitesTierTable
                          rows={analytics.byTier}
                          currency={currency}
                          loading={loading}
                          selectedTierId={stationSizeId}
                          onSelectTier={(id) => selectStationSize(id)}
                        />
                      </div>
                    ) : loading ? (
                      <Card loading style={{ marginTop: 8 }} />
                    ) : (
                      <Alert
                        className="mt-2"
                        type="info"
                        showIcon
                        title="No tier performance data"
                        description="There is no tier sales activity for the selected period and filters."
                      />
                    ),
                }))}
              />
            </>
          ) : initDone && orgId && !loading && !needsOrg && !error && stations.length > 0 ? (
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

export default AnalyticsSitesPage;
