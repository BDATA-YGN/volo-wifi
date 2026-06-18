"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Segmented,
  Typography,
  theme,
} from "antd";
import { HistoryOutlined, ReloadOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingSubscriptionChangelog } from "./useBillingSubscriptionChangelog";
import ChangelogStats from "./components/ChangelogStats";
import OrgPicker from "./components/OrgPicker";
import OrgSummaryTable from "./components/OrgSummaryTable";
import TenantLicenseBanner from "./components/TenantLicenseBanner";
import ChangelogFilters from "./components/ChangelogFilters";
import ChangelogTable from "./components/ChangelogTable";
import ChangelogTimeline from "./components/ChangelogTimeline";

const { Paragraph } = Typography;

const BillingSubscriptionChangelogPage: React.FC = () => {
  const { token } = theme.useToken();
  const searchParams = useSearchParams();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    () => searchParams.get("orgId")
  );
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

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
    setChangeType,
    setTierCode,
    setPagination,
  } = useBillingSubscriptionChangelog(selectedOrgId);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const tierOptions = useMemo(
    () =>
      (detail?.availableTiers ?? []).map((t) => ({
        code: t.code,
        name: t.name,
      })),
    [detail?.availableTiers]
  );

  return (
    <div className="p-0">
      <CommonHeader icon={HistoryOutlined} />

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
            Audit history for subscription changes — site limits, status updates, and tier-rate
            adjustments. Entries are recorded automatically and cannot be edited here.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load changelog"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-4">
              <ChangelogStats
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
                      start building subscription history.
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
                      <TenantLicenseBanner org={detail.org} license={detail.license} />
                    </Card>
                  ) : null}

                  <Card
                    title="Change history"
                    styles={{ body: { padding: 16 } }}
                    style={{ borderRadius: token.borderRadiusLG }}
                  >
                    <div className="mb-4 flex flex-col gap-3">
                      <ChangelogFilters
                        search={searchInput}
                        changeType={filters.changeType ?? null}
                        tierCode={filters.tierCode ?? null}
                        tierOptions={tierOptions}
                        onSearchChange={setSearchInput}
                        onChangeTypeChange={setChangeType}
                        onTierCodeChange={setTierCode}
                      />
                      <Segmented
                        value={viewMode}
                        onChange={(v) => setViewMode(v as "table" | "timeline")}
                        options={[
                          { label: "Table", value: "table" },
                          { label: "Timeline", value: "timeline" },
                        ]}
                      />
                    </div>

                    {viewMode === "table" ? (
                      <ChangelogTable
                        entries={detail?.entries ?? []}
                        loading={detailLoading}
                        currency={detail?.org.currency}
                        page={filters.page ?? 1}
                        pageSize={filters.limit ?? 20}
                        total={detailMeta?.total ?? 0}
                        onPaginationChange={setPagination}
                      />
                    ) : (
                      <ChangelogTimeline
                        entries={detail?.entries ?? []}
                        loading={detailLoading}
                        currency={detail?.org.currency}
                      />
                    )}
                  </Card>
                </>
              )}
        </div>
      </div>
    </div>
  );
};

export default BillingSubscriptionChangelogPage;
