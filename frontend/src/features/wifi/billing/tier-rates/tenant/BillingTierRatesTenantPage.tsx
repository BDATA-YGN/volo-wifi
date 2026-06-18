"use client";

import React, { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Button, Card, Tabs, Typography, theme } from "antd";
import { ReloadOutlined, SwapOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingTierRatesTenant } from "./useBillingTierRatesTenant";
import type { TenantOverrideFormValues, TenantRateMatrixRow } from "./types";
import OrgSelector from "./components/OrgSelector";
import TenantRatesStats from "./components/TenantRatesStats";
import TenantRatesMatrixTable from "./components/TenantRatesMatrixTable";
import TenantOverrideHistoryTable from "./components/TenantOverrideHistoryTable";
import SetTenantOverrideDrawer from "./components/SetTenantOverrideDrawer";

const { Paragraph, Text } = Typography;

const BillingTierRatesTenantPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState<TenantRateMatrixRow | null>(null);
  const [editingScheduled, setEditingScheduled] = useState(false);

  const {
    orgs,
    org,
    matrix,
    history,
    meta,
    loading,
    orgsLoading,
    ratesLoading,
    error,
    refresh,
    createOverride,
    updateOverride,
  } = useBillingTierRatesTenant(selectedOrgId);

  const tiers = matrix.map((m) => m.stationSize);
  const orgsWithOverrides = useMemo(
    () => orgs.filter((o) => (o.overrideCount ?? 0) > 0).length,
    [orgs]
  );

  const openSetOverride = (row?: TenantRateMatrixRow) => {
    setActiveRow(row ?? null);
    setEditingScheduled(false);
    setDrawerOpen(true);
  };

  const openEditScheduled = (row: TenantRateMatrixRow) => {
    setActiveRow(row);
    setEditingScheduled(true);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setActiveRow(null);
    setEditingScheduled(false);
  };

  const handleSubmit = async (values: TenantOverrideFormValues) => {
    setSaving(true);
    try {
      if (editingScheduled && activeRow?.scheduledOverride) {
        await updateOverride(activeRow.scheduledOverride.id, values);
        message.success("Scheduled override updated");
      } else {
        await createOverride(values);
        message.success("Tenant tier override saved");
      }
      setDrawerOpen(false);
      setActiveRow(null);
      setEditingScheduled(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save override"));
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = (row: TenantRateMatrixRow) => {
    if (!row.tenantOverride) return;
    modal.confirm({
      title: `Revert ${row.stationSize.code} to platform default?`,
      content:
        "The active tenant override will be deactivated. Billing will use the platform tier rate for this capacity tier.",
      okText: "Revert to platform",
      okType: "danger",
      onOk: async () => {
        try {
          await updateOverride(row.tenantOverride!.id, { isActive: false });
          message.success("Override deactivated — platform default applies");
          refresh();
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to deactivate override"));
          throw err;
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={SwapOutlined} />

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
            Optional per-tenant monthly license rates by capacity tier. Resolution order:{" "}
            <Text strong>tenant override</Text> first, then{" "}
            <Link href="/wifi/billing/tier-rates/platform">platform tier rates</Link> when no
            active override exists. Overrides can also be set during{" "}
            <Link href="/wifi/billing/tenant-registration">tenant registration</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load tenant tier rates"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-4">
              <Card
                size="small"
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <OrgSelector
                  orgs={orgs}
                  value={selectedOrgId}
                  loading={orgsLoading}
                  onChange={(id) => setSelectedOrgId(id || null)}
                />
              </Card>

              <TenantRatesStats
                meta={meta}
                orgCount={orgs.length}
                orgsWithOverrides={orgsWithOverrides}
                loading={loading}
                orgSelected={Boolean(selectedOrgId)}
              />

              {!selectedOrgId ? (
                <Card styles={{ body: { padding: 32 } }} style={{ borderRadius: token.borderRadiusLG }}>
                  <div className="text-center">
                    <Text type="secondary">
                      Select a tenant organization above to view and manage tier rate overrides.
                    </Text>
                    {orgs.length === 0 && !orgsLoading ? (
                      <div className="mt-3">
                        <Link href="/wifi/billing/tenant-registration">Register a tenant</Link> to get
                        started.
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : (
                <>
                  {org ? (
                    <Card
                      size="small"
                      styles={{ body: { padding: "12px 16px" } }}
                      style={{ borderRadius: token.borderRadiusLG }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Text strong>{org.name}</Text>
                          <Text type="secondary" className="ml-2">
                            {org.code}
                          </Text>
                          {org.orgLicense ? (
                            <Text type="secondary" className="ml-2" style={{ fontSize: 12 }}>
                              · {org.orgLicense.status} · {org.orgLicense.stationLimit} site limit
                            </Text>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={ratesLoading}>
                            Refresh
                          </Button>
                          <Button type="primary" onClick={() => openSetOverride()} disabled={!tiers.length}>
                            Set override
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : null}

                  <Card
                    title="Rates by capacity tier"
                    styles={{ body: { padding: 20 } }}
                    style={{ borderRadius: token.borderRadiusLG }}
                  >
                    <TenantRatesMatrixTable
                      data={matrix}
                      loading={ratesLoading}
                      onSetOverride={openSetOverride}
                      onEditScheduled={openEditScheduled}
                      onClearOverride={handleClearOverride}
                    />
                  </Card>

                  <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: token.borderRadiusLG }}>
                    <Tabs
                      items={[
                        {
                          key: "history",
                          label: "Override history",
                          children: (
                            <TenantOverrideHistoryTable data={history} loading={ratesLoading} />
                          ),
                        },
                      ]}
                    />
                  </Card>
                </>
              )}
        </div>
      </div>

      <SetTenantOverrideDrawer
        open={drawerOpen}
        saving={saving}
        org={org}
        tiers={tiers}
        presetTierId={activeRow?.stationSize.id}
        editingScheduled={editingScheduled}
        matrixRow={activeRow}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default BillingTierRatesTenantPage;
