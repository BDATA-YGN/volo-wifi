"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Input,
  Segmented,
  Switch,
  Typography,
  theme,
} from "antd";
import { ReloadOutlined, SearchOutlined, WifiOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingSubscriptionSites } from "./useBillingSubscriptionSites";
import LicensedSitesStats from "./components/LicensedSitesStats";
import OrgPicker from "./components/OrgPicker";
import OrgSummaryTable from "./components/OrgSummaryTable";
import LicenseUsageBanner from "./components/LicenseUsageBanner";
import TierSummaryCards from "./components/TierSummaryCards";
import TierGroupCollapse from "./components/TierGroupCollapse";
import LicensedSitesTable from "./components/LicensedSitesTable";

const { Paragraph } = Typography;

const BillingSubscriptionSitesPage: React.FC = () => {
  const { token } = theme.useToken();
  const searchParams = useSearchParams();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    () => searchParams.get("orgId")
  );
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");

  useEffect(() => {
    const orgId = searchParams.get("orgId");
    if (orgId) setSelectedOrgId(orgId);
  }, [searchParams]);

  const {
    orgs,
    listMeta,
    detail,
    detailMeta,
    filters,
    loading,
    orgsLoading,
    detailLoading,
    error,
    refresh,
    setSearch,
    setTierCode,
    setBillableOnly,
  } = useBillingSubscriptionSites(selectedOrgId);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const flatSites = useMemo(
    () => detail?.groups.flatMap((g) => g.sites) ?? [],
    [detail?.groups]
  );

  return (
    <div className="p-0">
      <CommonHeader icon={WifiOutlined} />

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
            Billable WiFi sites per tenant subscription, grouped by capacity tier. Active sites
            count toward the licensed site limit and monthly SaaS invoice.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load licensed sites"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-4">
              <LicensedSitesStats
                meta={selectedOrgId ? detailMeta : listMeta}
                loading={selectedOrgId ? detailLoading : orgsLoading}
                mode={selectedOrgId ? "detail" : "list"}
              />

              <Card
                size="small"
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <OrgPicker
                  orgs={orgs}
                  value={selectedOrgId}
                  loading={orgsLoading}
                  onChange={setSelectedOrgId}
                />
              </Card>

              {!selectedOrgId ? (
                <Card
                  title="Tenants"
                  extra={
                    <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={orgsLoading}>
                      Refresh
                    </Button>
                  }
                  styles={{ body: { padding: 20 } }}
                  style={{ borderRadius: token.borderRadiusLG }}
                >
                  <OrgSummaryTable
                    data={orgs}
                    loading={orgsLoading}
                    onSelect={setSelectedOrgId}
                  />
                  {orgs.length === 0 && !orgsLoading ? (
                    <div className="mt-4 text-center">
                      <Link href="/wifi/billing/tenant-registration">Register a tenant</Link> to
                      view licensed sites.
                    </div>
                  ) : null}
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button type="link" onClick={() => setSelectedOrgId(null)} style={{ padding: 0 }}>
                      ← All tenants
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={detailLoading}>
                      Refresh
                    </Button>
                  </div>

                  {detail?.org && detail?.license ? (
                    <Card
                      styles={{ body: { padding: 20 } }}
                      style={{ borderRadius: token.borderRadiusLG }}
                    >
                      <LicenseUsageBanner org={detail.org} license={detail.license} />
                    </Card>
                  ) : null}

                  <Card
                    title="Sites by capacity tier"
                    styles={{ body: { padding: 16 } }}
                    style={{ borderRadius: token.borderRadiusLG }}
                  >
                    <TierSummaryCards
                      groups={detail?.groups ?? []}
                      selectedTierCode={filters.tierCode ?? null}
                      loading={detailLoading}
                      onSelectTier={setTierCode}
                    />
                  </Card>

                  <Card
                    styles={{ body: { padding: 16 } }}
                    style={{ borderRadius: token.borderRadiusLG }}
                  >
                    <div className="mb-4 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          allowClear
                          prefix={<SearchOutlined />}
                          placeholder="Search site name, code, or location…"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          style={{ maxWidth: 360 }}
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={filters.billableOnly !== false}
                            onChange={setBillableOnly}
                          />
                          <span style={{ fontSize: 13 }}>Billable only (active sites)</span>
                        </div>
                      </div>
                      <Segmented
                        value={viewMode}
                        onChange={(v) => setViewMode(v as "grouped" | "table")}
                        options={[
                          { label: "Grouped by tier", value: "grouped" },
                          { label: "Flat table", value: "table" },
                        ]}
                      />
                    </div>

                    {viewMode === "grouped" ? (
                      <TierGroupCollapse groups={detail?.groups ?? []} loading={detailLoading} />
                    ) : (
                      <LicensedSitesTable sites={flatSites} loading={detailLoading} />
                    )}
                  </Card>
                </>
              )}
        </div>
      </div>
    </div>
  );
};

export default BillingSubscriptionSitesPage;
