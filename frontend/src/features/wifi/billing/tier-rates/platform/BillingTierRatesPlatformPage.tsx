"use client";

import React, { useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Button, Card, Col, Row, Tabs, theme } from "antd";
import { ArrowRightOutlined, DollarOutlined, ReloadOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingTierRatesPlatform } from "./useBillingTierRatesPlatform";
import type { PlatformRateFormValues, TierRateMatrixRow } from "./types";
import PlatformSetupPanel from "./components/PlatformSetupPanel";
import PlatformRatesStats from "./components/PlatformRatesStats";
import TierRatesMatrixTable from "./components/TierRatesMatrixTable";
import RateHistoryTable from "./components/RateHistoryTable";
import SetRateFormDrawer from "./components/SetRateFormDrawer";



const BillingTierRatesPlatformPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const {
    matrix,
    history,
    meta,
    loading,
    error,
    refresh,
    createRate,
    updateRate,
  } = useBillingTierRatesPlatform();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState<TierRateMatrixRow | null>(null);
  const [editingScheduled, setEditingScheduled] = useState(false);

  const tiers = matrix.map((m) => m.stationSize);
  const missingRates = (meta?.missingCount ?? 0) > 0;
  const noTiers = tiers.length === 0;

  const openSetRate = (row?: TierRateMatrixRow) => {
    setActiveRow(row ?? null);
    setEditingScheduled(false);
    setDrawerOpen(true);
  };

  const openEditScheduled = (row: TierRateMatrixRow) => {
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

  const handleSubmit = async (values: PlatformRateFormValues) => {
    setSaving(true);
    try {
      if (editingScheduled && activeRow?.scheduledRate) {
        await updateRate(activeRow.scheduledRate.id, values);
        message.success("Scheduled rate updated");
      } else {
        await createRate(values);
        message.success("Platform tier rate saved");
      }
      setDrawerOpen(false);
      setActiveRow(null);
      setEditingScheduled(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save rate"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateCurrent = (row: TierRateMatrixRow) => {
    if (!row.currentRate) return;
    modal.confirm({
      title: `Deactivate rate for ${row.stationSize.code}?`,
      content:
        "This tier will have no active platform rate until a new one is set. Tenant registration may be blocked.",
      okText: "Deactivate",
      okType: "danger",
      onOk: async () => {
        try {
          await updateRate(row.currentRate!.id, { isActive: false });
          message.success("Rate deactivated");
          refresh();
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to deactivate rate"));
          throw err;
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={DollarOutlined} />

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
            message="Failed to load platform tier rates"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        {noTiers ? (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title="Capacity tiers required"
            description={
              <span>
                Define site capacity types before setting rates.{" "}
                <Link href="/wifi/billing/capacity-tiers">Go to Capacity Tiers</Link>
              </span>
            }
          />
        ) : null}

        {missingRates && !noTiers ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={`${meta?.missingCount} tier(s) without a current monthly rate`}
            description="All active capacity tiers need a platform rate before tenant registration."
          />
        ) : null}

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={17}>
            <div className="flex flex-col gap-4">
              <PlatformRatesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
                title="Monthly rates by tier"
                extra={
                  <div className="flex gap-2">
                    <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={loading}>
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => openSetRate()}
                      disabled={noTiers}
                    >
                      Set rate
                    </Button>
                  </div>
                }
              >
                <TierRatesMatrixTable
                  data={matrix}
                  loading={loading}
                  onSetRate={openSetRate}
                  onEditScheduled={openEditScheduled}
                  onDeactivateCurrent={handleDeactivateCurrent}
                />

                {!missingRates && tiers.length > 0 ? (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
                  >
                    <Link href="/wifi/billing/tenant-registration">
                      <Button type="link" icon={<ArrowRightOutlined />} style={{ padding: 0 }}>
                        Continue to tenant registration
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </Card>

              <Card
                styles={{ body: { padding: 20 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <Tabs
                  items={[
                    {
                      key: "history",
                      label: "Rate history",
                      children: <RateHistoryTable data={history} loading={loading} />,
                    },
                  ]}
                />
              </Card>
            </div>
          </Col>

          <Col xs={24} xl={7}>
            <PlatformSetupPanel />
          </Col>
        </Row>
      </div>

      <SetRateFormDrawer
        open={drawerOpen}
        saving={saving}
        tiers={tiers}
        presetTierId={activeRow?.stationSize.id}
        editingScheduledId={editingScheduled ? activeRow?.scheduledRate?.id : null}
        matrixRow={activeRow}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default BillingTierRatesPlatformPage;
