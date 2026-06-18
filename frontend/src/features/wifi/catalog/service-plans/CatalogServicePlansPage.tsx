"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import Link from "next/link";
import { Alert, App, Card, Typography, theme } from "antd";
import { Package } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCatalogServicePlans } from "./useCatalogServicePlans";
import type { PlanQuotaType, ServicePlanFormValues, ServicePlanRecord } from "./types";
import ServicePlansStats from "./components/ServicePlansStats";
import ServicePlansToolbar from "./components/ServicePlansToolbar";
import ServicePlansTable from "./components/ServicePlansTable";
import PlanFormDrawer from "./components/PlanFormDrawer";
import PlanDetailDrawer from "./components/PlanDetailDrawer";

const { Paragraph } = Typography;

const CatalogServicePlansPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePlanRecord | null>(null);
  const [selected, setSelected] = useState<ServicePlanRecord | null>(null);
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
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    refresh,
    loadFormOptions,
    loadPlan,
    createPlan,
    updatePlan,
    removePlan,
  } = useCatalogServicePlans();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    if (initDone && meta?.memberships?.length === 1 && !orgId) {
      selectOrg(meta.memberships[0].id);
    }
  }, [initDone, meta?.memberships, orgId, selectOrg]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showSwitcher = memberships.length > 1;
  const needsOrg = initDone && !orgId && memberships.length > 1;
  const unpricedCount = list.filter((p) => (p._count?.prices ?? 0) === 0 && p.isActive).length;

  const openCreate = () => {
    setEditing(null);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openEdit = (record: ServicePlanRecord) => {
    setEditing(record);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: ServicePlanRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleCreate = async (values: ServicePlanFormValues) => {
    setSaving(true);
    try {
      await createPlan(values);
      message.success("Service plan created");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create plan"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, values: ServicePlanFormValues) => {
    setSaving(true);
    try {
      await updatePlan(id, values);
      message.success("Service plan updated");
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update plan"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (record: ServicePlanRecord, active: boolean) => {
    try {
      await updatePlan(record.id, { isActive: active });
      message.success(active ? "Plan activated" : "Plan deactivated");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update plan status"));
    }
  };

  const handleDelete = (record: ServicePlanRecord) => {
    modal.confirm({
      title: `Delete plan "${record.code}"?`,
      content: "Soft-deletes the catalog entry. Plans with credentials or sales cannot be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removePlan(record.id);
          message.success("Service plan removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete plan"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Package} />

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
            Internet plan catalog for your tenant — define quota, validity, and device limits for
            tokens and vouchers. Set retail prices separately on{" "}
            <Link href="/wifi/catalog/retail-pricing">Retail Pricing</Link>.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load service plans"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          {showSwitcher ? (
            <OrgSwitcher
              memberships={memberships}
              value={orgId}
              required={needsOrg}
              loading={loading}
              onChange={selectOrg}
            />
          ) : null}

          {needsOrg ? (
            <Alert
              type="info"
              showIcon
              message="Select an organization"
              description="Choose a tenant to manage its service plan catalog."
            />
          ) : null}

          {orgId ? (
            <>
              {unpricedCount > 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  title={`${unpricedCount} active plan${unpricedCount === 1 ? "" : "s"} without retail pricing`}
                  description={
                    <span>
                      Assign prices on{" "}
                      <Link href="/wifi/catalog/retail-pricing">Retail Pricing</Link> before selling
                      at POS or generating vouchers.
                    </span>
                  }
                />
              ) : null}

              <ServicePlansStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <ServicePlansToolbar
                  search={search}
                  quotaType={(params.quotaType as PlanQuotaType) ?? null}
                  isActive={(params.isActive as "true" | "false") ?? null}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onQuotaTypeChange={(quotaType) =>
                    patchParams({ quotaType: quotaType ?? undefined, page: 1 })
                  }
                  onActiveChange={(isActive) =>
                    patchParams({ isActive: isActive ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <ServicePlansTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onEdit={openEdit}
                  onToggleActive={(r, a) => void handleToggleActive(r, a)}
                  onDelete={handleDelete}
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

      <PlanFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <PlanDetailDrawer
        open={detailOpen}
        planId={selected?.id ?? null}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onEdit={openEdit}
        loadPlan={loadPlan}
      />
    </div>
  );
};

export default CatalogServicePlansPage;
