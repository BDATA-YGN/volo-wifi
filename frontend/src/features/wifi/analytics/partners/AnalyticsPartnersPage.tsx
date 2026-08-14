"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Card, Typography, theme } from "antd";
import { UsersRound } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import {
  needsOrgSelection,
  shouldShowOrgSwitcher,
} from "@/features/wifi/shared/hooks/useWifiOrgScope";
import {
  isTodayRange,
  rangeFromPeriodPreset,
  todayRange,
} from "@/features/wifi/analytics/sites/constant";
import { useAnalyticsPartners } from "./useAnalyticsPartners";
import type { PartnerAnalyticsTab, PeriodPreset } from "./types";
import { DEFAULT_PERIOD, DEFAULT_TAB } from "./constant";
import PartnersToolbar from "./components/PartnersToolbar";
import PartnersKpiCards from "./components/PartnersKpiCards";
import PartnersTrendChart from "./components/PartnersTrendChart";
import PartnersTable from "./components/PartnersTable";
import { formatMoney } from "./utils";

const { Title, Text } = Typography;

function parseTab(value: string | null): PartnerAnalyticsTab {
  if (value === "stats" || value === "partners") return value;
  return DEFAULT_TAB;
}

function parseIdList(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

function parsePeriod(value: string | null): PeriodPreset {
  if (value === "today" || value === "7d" || value === "30d" || value === "90d") return value;
  return DEFAULT_PERIOD;
}

function parseRangeFromSearch(searchParams: URLSearchParams): {
  range: [Dayjs, Dayjs];
  custom: boolean;
} {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && to) {
    const start = dayjs(from);
    const end = dayjs(to);
    if (start.isValid() && end.isValid()) {
      const range: [Dayjs, Dayjs] = [start.startOf("day"), end.endOf("day")];
      return { range, custom: !isTodayRange(range[0], range[1]) };
    }
  }
  const period = parsePeriod(searchParams.get("period"));
  const range = rangeFromPeriodPreset(period);
  return { range, custom: period !== "today" };
}

const AnalyticsPartnersPage: React.FC = () => {
  const { token } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const selectedSiteIds = parseIdList(searchParams.get("sites"));
  const selectedTierIds = parseIdList(searchParams.get("tiers"));
  const initialRange = parseRangeFromSearch(searchParams);

  const [initDone, setInitDone] = useState(false);
  const [hideZeroSales, setHideZeroSalesState] = useState(
    () => searchParams.get("hideZero") === "1"
  );
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    initialRange.range
  );

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
    (nextTab: PartnerAnalyticsTab) => {
      replaceParams({ tab: nextTab });
    },
    [replaceParams]
  );

  const setHideZeroSales = useCallback(
    (hide: boolean) => {
      setHideZeroSalesState(hide);
      replaceParams({ hideZero: hide ? "1" : null });
    },
    [replaceParams]
  );

  const {
    analytics,
    meta,
    loading,
    error,
    orgId,
    formOptions,
    selectOrg,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
    loadFormOptions,
  } = useAnalyticsPartners({
    periodFrom: initialRange.custom ? initialRange.range[0].toISOString() : undefined,
    periodTo: initialRange.custom ? initialRange.range[1].toISOString() : undefined,
  });

  const setSelectedSiteIds = useCallback(
    (ids: string[]) => {
      replaceParams({ sites: ids.length > 0 ? ids.join(",") : null });
    },
    [replaceParams]
  );

  const setSelectedTierIds = useCallback(
    (ids: string[]) => {
      const nextSites =
        ids.length === 0
          ? selectedSiteIds
          : selectedSiteIds.filter((siteId) => {
              const site = (formOptions.stations ?? []).find((s) => s.id === siteId);
              return site ? ids.includes(site.stationSizeId) : false;
            });
      replaceParams({
        tiers: ids.length > 0 ? ids.join(",") : null,
        sites: nextSites.length > 0 ? nextSites.join(",") : null,
      });
    },
    [replaceParams, selectedSiteIds, formOptions.stations]
  );

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
    const patch: Record<string, string | null | undefined> = {};
    if (!searchParams.get("tab")) patch.tab = DEFAULT_TAB;
    if (!searchParams.get("from") && !searchParams.get("to") && !searchParams.get("period")) {
      patch.period = DEFAULT_PERIOD;
    }
    if (Object.keys(patch).length > 0) replaceParams(patch);
  }, [replaceParams, searchParams]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const resellers = formOptions.resellers;
  const orgScopeMeta = {
    canSwitchOrg: meta?.canSwitchOrg ?? formOptions.canSwitchOrg,
    requiresOrgSelection: meta?.requiresOrgSelection ?? formOptions.requiresOrgSelection,
  };
  const showOrgSwitcher = shouldShowOrgSwitcher(memberships, orgScopeMeta);
  const needsOrg = needsOrgSelection(orgId, orgScopeMeta, memberships.length);
  const currency = analytics?.org.currency ?? formOptions.currency;

  const periodLabel = useMemo(() => {
    if (!analytics) return null;
    return `${dayjs(analytics.periodFrom).format("D MMM YYYY")} – ${dayjs(analytics.periodTo).format("D MMM YYYY")}`;
  }, [analytics]);

  const visiblePartners = useMemo(() => {
    const rows = analytics?.byPartner ?? [];
    return rows.filter((row) => {
      if (hideZeroSales && row.itemsCount <= 0) return false;
      const stations = row.stations ?? [];
      if (
        selectedSiteIds.length > 0 &&
        !stations.some((site) => selectedSiteIds.includes(site.stationId))
      ) {
        return false;
      }
      if (
        selectedTierIds.length > 0 &&
        !stations.some(
          (site) => site.stationSizeId && selectedTierIds.includes(site.stationSizeId)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [analytics?.byPartner, hideZeroSales, selectedSiteIds, selectedTierIds]);

  const handleCustomRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    const next = range?.[0] && range?.[1] ? range : todayRange();
    const from = next[0]!.startOf("day");
    const to = next[1]!.endOf("day");
    setCustomRange([from, to]);

    if (isTodayRange(from, to)) {
      clearCustomPeriod();
      selectPreset("today");
      replaceParams({ period: "today", from: null, to: null });
      return;
    }

    selectCustomPeriod(from.toISOString(), to.toISOString());
    replaceParams({
      period: null,
      from: from.format("YYYY-MM-DD"),
      to: to.format("YYYY-MM-DD"),
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={UsersRound} />

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
            title="Failed to load partner analytics"
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
              onChange={(id) => {
                replaceParams({ sites: null, tiers: null });
                selectOrg(id);
              }}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              title="Select an organization"
              description="Choose a tenant to view partner analytics."
            />
          ) : null}

          {orgId && resellers.length === 0 && initDone && !loading && !needsOrg ? (
            <Alert
              type="warning"
              showIcon
              title="No partners configured"
              description={
                <span>
                  Create reseller accounts in{" "}
                  <Link href="/wifi/commerce/partners">Partner Directory</Link> before viewing
                  analytics.
                </span>
              }
            />
          ) : null}

          {orgId && !needsOrg ? (
            <>
              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                {analytics ? (
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        All partners
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {analytics.org.name}
                        {periodLabel ? ` · ${periodLabel}` : ""}
                        {` · ${analytics.summary.partnerCount} partner${
                          analytics.summary.partnerCount === 1 ? "" : "s"
                        }`}
                      </Text>
                    </div>
                    <div className="sm:text-right">
                      <Title level={3} style={{ margin: 0 }}>
                        {formatMoney(analytics.summary.revenue, currency)}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {analytics.summary.itemsCount.toLocaleString()} tokens
                        {` · ${analytics.summary.activePartnerCount} active`}
                      </Text>
                    </div>
                  </div>
                ) : null}

                <PartnersToolbar
                  tab={tab}
                  customRange={customRange}
                  dataSource={analytics?.dataSource}
                  hideZeroSales={hideZeroSales}
                  stations={formOptions.stations ?? []}
                  stationSizes={formOptions.stationSizes ?? []}
                  selectedSiteIds={selectedSiteIds}
                  selectedTierIds={selectedTierIds}
                  loading={loading}
                  onTabChange={setTab}
                  onCustomRangeChange={handleCustomRangeChange}
                  onHideZeroSalesChange={setHideZeroSales}
                  onSiteIdsChange={setSelectedSiteIds}
                  onTierIdsChange={setSelectedTierIds}
                  onRefresh={refresh}
                />
              </Card>

              {tab === "stats" ? (
                analytics ? (
                  <div className="flex flex-col gap-4">
                    <PartnersKpiCards
                      summary={analytics.summary}
                      previous={analytics.previousSummary}
                      currency={currency}
                      loading={loading}
                    />
                    <PartnersTrendChart
                      points={analytics.dailyTrend}
                      currency={currency}
                      loading={loading}
                    />
                  </div>
                ) : loading ? (
                  <Card loading />
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    title="No analytics data"
                    description="There is no sales or usage activity for the selected period and filters."
                  />
                )
              ) : analytics ? (
                <PartnersTable
                  rows={visiblePartners}
                  plans={analytics.plans ?? []}
                  planTotals={
                    hideZeroSales || selectedSiteIds.length > 0 || selectedTierIds.length > 0
                      ? undefined
                      : analytics.planTotals ?? []
                  }
                  loading={loading}
                  exportSubtitle={[analytics.org.name, periodLabel].filter(Boolean).join(" · ")}
                  exportFilename={`partner-performance_${dayjs(analytics.periodFrom).format("YYYY-MM-DD")}_${dayjs(analytics.periodTo).format("YYYY-MM-DD")}`}
                />
              ) : loading ? (
                <Card loading />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  title="No partner performance data"
                  description="There is no partner sales activity for the selected period and filters."
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPartnersPage;
