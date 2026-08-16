"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, theme } from "antd";
import { Ticket } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useAccessVoucherRuns } from "./useAccessVoucherRuns";
import type { VoucherBatchRecord, VoucherRunFormValues } from "./types";
import VoucherRunsStats from "./components/VoucherRunsStats";
import VoucherRunsToolbar from "./components/VoucherRunsToolbar";
import VoucherRunsTable from "./components/VoucherRunsTable";
import VoucherRunFormDrawer from "./components/VoucherRunFormDrawer";
import VoucherRunDetailDrawer from "./components/VoucherRunDetailDrawer";
import { canCancelVoucherRun } from "./utils";

const AccessVoucherRunsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<VoucherBatchRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    orgId,
    formOptions,
    canViewAllOrgs,
    setPagination,
    patchParams,
    selectOrg,
    clearOrg,
    refresh,
    loadFormOptions,
    loadRun,
    createRun,
    cancelRun,
  } = useAccessVoucherRuns();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showSwitcher = canViewAllOrgs || memberships.length > 1;
  const needsOrg = initDone && !canViewAllOrgs && !orgId && memberships.length > 1;
  const contextReady = canViewAllOrgs || Boolean(orgId);
  const noPlans = contextReady && formOptions.plans.length === 0;
  const showAllOrgLabels = canViewAllOrgs && !orgId;

  const openCreate = () => {
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: VoucherBatchRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const handleCreate = async (values: VoucherRunFormValues) => {
    setSaving(true);
    try {
      await createRun(values);
      message.success(`Generated ${values.quantity} vouchers`);
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create voucher run"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (record: VoucherBatchRecord) => {
    if (!canCancelVoucherRun(record)) {
      message.warning("This run cannot be cancelled — voucher codes have already been sold.");
      return;
    }

    modal.confirm({
      title: `Cancel run ${record.batchNo}?`,
      content:
        "Unused capacity will be voided. This cannot be undone. Runs with sold codes cannot be cancelled.",
      okText: "Cancel run",
      okType: "danger",
      onOk: async () => {
        try {
          await cancelRun(record.id, record.orgId);
          message.success("Voucher run cancelled");
          if (selected?.id === record.id) {
            setDetailOpen(false);
            setSelected(null);
          }
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to cancel run"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Ticket} />

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
            message="Failed to load voucher runs"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              allowClear={canViewAllOrgs}
              loading={loading}
              onChange={selectOrg}
              onClear={canViewAllOrgs ? clearOrg : undefined}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              message="Select an organization"
              description="Choose a tenant to manage voucher runs."
            />
          ) : null}

          {contextReady ? (
            <>
              <VoucherRunsStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <VoucherRunsToolbar
                  planId={(params.planId as string) ?? null}
                  stationId={(params.stationId as string) ?? null}
                  township={(params.township as string) ?? null}
                  stationSizeId={(params.stationSizeId as string) ?? null}
                  dateFrom={(params.dateFrom as string) ?? null}
                  dateTo={(params.dateTo as string) ?? null}
                  hasBalance={Boolean(params.hasBalance)}
                  formOptions={formOptions}
                  showOrgInLabels={showAllOrgLabels}
                  loading={loading}
                  createDisabled={noPlans}
                  onPlanChange={(planId) =>
                    patchParams({ planId: planId ?? undefined, page: 1 })
                  }
                  onStationChange={(stationId) =>
                    patchParams({ stationId: stationId ?? undefined, page: 1 })
                  }
                  onTownshipChange={(township) => {
                    const nextTownship = township ?? undefined;
                    const currentStation = formOptions.stations.find(
                      (s) => s.id === params.stationId
                    );
                    const keepStation =
                      !nextTownship ||
                      !currentStation ||
                      (currentStation.township ?? "").toLowerCase() ===
                        nextTownship.toLowerCase();
                    patchParams({
                      township: nextTownship,
                      stationId: keepStation ? params.stationId : undefined,
                      page: 1,
                    });
                  }}
                  onTierChange={(stationSizeId) => {
                    const nextTier = stationSizeId ?? undefined;
                    const currentStation = formOptions.stations.find(
                      (s) => s.id === params.stationId
                    );
                    const keepStation =
                      !nextTier || !currentStation || currentStation.stationSizeId === nextTier;
                    patchParams({
                      stationSizeId: nextTier,
                      stationId: keepStation ? params.stationId : undefined,
                      page: 1,
                    });
                  }}
                  onDateRangeChange={(dateFrom, dateTo) =>
                    patchParams({
                      dateFrom: dateFrom ?? undefined,
                      dateTo: dateTo ?? undefined,
                      page: 1,
                    })
                  }
                  onHasBalanceChange={(hasBalance) =>
                    patchParams({ hasBalance: hasBalance || undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <VoucherRunsTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onCancel={handleCancel}
                />
              </Card>
            </>
          ) : initDone && memberships.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="No organization access"
              description="Your account is not linked to a tenant. Contact a platform administrator."
            />
          ) : null}
        </div>
      </div>

      <VoucherRunFormDrawer
        open={drawerOpen}
        saving={saving}
        orgId={orgId}
        formOptions={formOptions}
        showOrgInLabels={showAllOrgLabels}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleCreate}
      />

      <VoucherRunDetailDrawer
        open={detailOpen}
        runId={selected?.id ?? null}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onCancel={handleCancel}
        loadRun={loadRun}
      />
    </div>
  );
};

export default AccessVoucherRunsPage;
