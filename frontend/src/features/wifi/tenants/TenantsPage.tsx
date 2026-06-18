"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, Typography, theme } from "antd";
import { Building2 } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useTenants } from "./useTenants";
import type { OrgLicenseStatus, TenantDetailRecord, TenantEditFormValues, TenantRecord } from "./types";
import TenantsStats from "./components/TenantsStats";
import TenantsToolbar from "./components/TenantsToolbar";
import TenantsTable from "./components/TenantsTable";
import TenantDetailDrawer from "./components/TenantDetailDrawer";
import TenantEditDrawer from "./components/TenantEditDrawer";

const { Paragraph } = Typography;

const TenantsPage: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetailRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    refresh,
    setSearch,
    setPagination,
    patchParams,
    loadTenant,
    updateTenant,
  } = useTenants();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openDetail = async (record: TenantRecord) => {
    setSelectedTenant(record as TenantDetailRecord);
    setDetailOpen(true);
  };

  const openEdit = async (record: TenantRecord) => {
    try {
      const { tenant } = await loadTenant(record.id);
      setSelectedTenant(tenant);
      setEditOpen(true);
    } catch {
      setSelectedTenant(record as TenantDetailRecord);
      setEditOpen(true);
    }
  };

  const openEditFromDetail = (tenant: TenantDetailRecord) => {
    setSelectedTenant(tenant);
    setDetailOpen(false);
    setEditOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    if (!editOpen) setSelectedTenant(null);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
    setSelectedTenant(null);
  };

  const handleUpdate = async (values: TenantEditFormValues) => {
    if (!selectedTenant) return;
    setSaving(true);
    try {
      await updateTenant(selectedTenant.id, values);
      message.success("Tenant updated");
      setEditOpen(false);
      setSelectedTenant(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update tenant"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Building2} />

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
            Platform-wide tenant directory — organizations, subscription status, licensed site
            usage, and member counts. New tenants are provisioned via Tenant Registration.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load tenants"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          <TenantsStats meta={meta} loading={loading} />

          <Card
            styles={{ body: { padding: 16 } }}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <TenantsToolbar
              search={search}
              isActive={(params.isActive as "true" | "false") ?? null}
              licenseStatus={(params.licenseStatus as OrgLicenseStatus) ?? null}
              hasLicense={(params.hasLicense as "true" | "false") ?? null}
              loading={loading}
              onSearchChange={setSearchLocal}
              onIsActiveChange={(v) =>
                patchParams({ isActive: v ?? undefined, page: 1 })
              }
              onLicenseStatusChange={(v) =>
                patchParams({ licenseStatus: v ?? undefined, page: 1 })
              }
              onHasLicenseChange={(v) =>
                patchParams({ hasLicense: v ?? undefined, page: 1 })
              }
              onRefresh={refresh}
            />
          </Card>

          <Card
            styles={{ body: { padding: 16 } }}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <TenantsTable
              data={list}
              loading={loading}
              page={params.page ?? 1}
              pageSize={params.limit ?? 20}
              total={meta?.total ?? 0}
              onPaginationChange={setPagination}
              onView={openDetail}
              onEdit={openEdit}
            />
          </Card>
        </div>
      </div>

      <TenantDetailDrawer
        open={detailOpen}
        tenantId={selectedTenant?.id ?? null}
        fallback={selectedTenant}
        onClose={closeDetail}
        onEdit={openEditFromDetail}
        loadTenant={loadTenant}
      />

      <TenantEditDrawer
        open={editOpen}
        saving={saving}
        tenant={selectedTenant}
        onClose={closeEdit}
        onSubmit={handleUpdate}
      />
    </div>
  );
};

export default TenantsPage;
