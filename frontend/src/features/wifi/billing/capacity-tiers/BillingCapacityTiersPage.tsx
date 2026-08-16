"use client";

import React, { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, Col, Row, theme } from "antd";
import { AppstoreOutlined, ArrowRightOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingCapacityTiers } from "./useBillingCapacityTiers";
import type { CapacityTierFormValues, CapacityTierRecord } from "./types";
import PlatformSetupPanel from "./components/PlatformSetupPanel";
import CapacityTiersStats from "./components/CapacityTiersStats";
import CapacityTiersToolbar, { type TierStatusFilter } from "./components/CapacityTiersToolbar";
import CapacityTiersTable from "./components/CapacityTiersTable";
import CapacityTierFormDrawer from "./components/CapacityTierFormDrawer";



const BillingCapacityTiersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const {
    list,
    meta,
    loading,
    error,
    refresh,
    setSearch,
    createTier,
    updateTier,
    deleteTier,
  } = useBillingCapacityTiers();

  const [search, setSearchLocal] = useState("");
  const [statusFilter, setStatusFilter] = useState<TierStatusFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CapacityTierRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const displayedList = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((row) => {
      if (statusFilter === "active" && !row.isActive) return false;
      if (statusFilter === "inactive" && row.isActive) return false;
      if (!term) return true;
      const haystack = [row.code, row.name, row.description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [list, search, statusFilter]);

  const missingRates = list.some((t) => t.isActive && (t._count?.globalLicensePrices ?? 0) === 0);
  const hasActiveTiers = list.some((t) => t.isActive);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: CapacityTierRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchLocal(value);
    setSearch(value);
  };

  const handleSubmit = async (values: CapacityTierFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updateTier(editing.id, values);
        message.success("Capacity tier updated");
      } else {
        await createTier(values);
        message.success("Capacity tier created");
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save capacity tier"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (record: CapacityTierRecord, active: boolean) => {
    try {
      await updateTier(record.id, { isActive: active });
      message.success(active ? "Tier activated" : "Tier deactivated");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update tier status"));
    }
  };

  const handleDelete = (record: CapacityTierRecord) => {
    const rateCount =
      (record._count?.globalLicensePrices ?? 0) + (record._count?.orgLicensePrices ?? 0);
    modal.confirm({
      title: `Delete tier "${record.code}"?`,
      content:
        rateCount > 0
          ? "This tier has no licensed sites. Related platform/tenant rates will also be removed. This cannot be undone."
          : "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteTier(record.id);
          message.success("Capacity tier deleted");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete tier"));
          throw err;
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={AppstoreOutlined} />

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
            message="Failed to load capacity tiers"
            description={String(error)}
            action={
              <button type="button" className="ant-btn ant-btn-sm" onClick={() => refresh()}>
                Retry
              </button>
            }
          />
        ) : null}

        {hasActiveTiers && missingRates ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Some active tiers do not have platform monthly rates"
            description={
              <span>
                Tenant registration and invoicing require a monthly rate per tier.{" "}
                <Link href="/wifi/billing/tier-rates/platform">Configure platform tier rates</Link>
              </span>
            }
          />
        ) : null}

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={17}>
            <div className="flex flex-col gap-4">
              <CapacityTiersStats list={list} meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <CapacityTiersToolbar
                  search={search}
                  statusFilter={statusFilter}
                  loading={loading}
                  onSearchChange={handleSearchChange}
                  onStatusChange={setStatusFilter}
                  onRefresh={() => refresh()}
                  onCreate={openCreate}
                />

                <div className="mt-4">
                  <CapacityTiersTable
                    data={displayedList}
                    loading={loading}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleActive={(r, a) => void handleToggleActive(r, a)}
                  />
                </div>

                {hasActiveTiers ? (
                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Link href="/wifi/billing/tier-rates/platform">
                      <span className="ant-btn ant-btn-link" style={{ padding: 0 }}>
                        Continue to platform tier rates <ArrowRightOutlined />
                      </span>
                    </Link>
                  </div>
                ) : null}
              </Card>
            </div>
          </Col>

          <Col xs={24} xl={7}>
            <PlatformSetupPanel />
          </Col>
        </Row>
      </div>

      <CapacityTierFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default BillingCapacityTiersPage;
