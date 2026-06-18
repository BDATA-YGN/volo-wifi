"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, Typography, theme } from "antd";
import { ClusterOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusVendorProfiles } from "./useNetworkRadiusVendorProfiles";
import type { CatalogAttribute, VendorProfileFormValues, VendorProfileRecord } from "./types";
import VendorProfilesStats from "./components/VendorProfilesStats";
import VendorProfilesToolbar from "./components/VendorProfilesToolbar";
import VendorProfilesTable from "./components/VendorProfilesTable";
import VendorProfileFormDrawer from "./components/VendorProfileFormDrawer";
import VendorProfileDetailDrawer from "./components/VendorProfileDetailDrawer";

const { Paragraph } = Typography;

const NetworkRadiusVendorProfilesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [catalog, setCatalog] = useState<CatalogAttribute[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VendorProfileRecord | null>(null);
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
    loadCatalog,
    loadProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
  } = useNetworkRadiusVendorProfiles();

  useEffect(() => {
    void loadCatalog().then(setCatalog);
  }, [loadCatalog]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = async (record: VendorProfileRecord) => {
    setDetailOpen(false);
    const full = record.supportedAttributeRows
      ? record
      : await loadProfile(record.id);
    setEditing(full);
    setFormOpen(true);
  };

  const openView = (record: VendorProfileRecord) => {
    setDetailId(record.id);
    setDetailOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: VendorProfileFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updateProfile(editing.id, values);
        message.success("Vendor profile updated");
      } else {
        await createProfile(values);
        message.success("Vendor profile created");
      }
      setFormOpen(false);
      setEditing(null);
      if (detailId) setDetailOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: VendorProfileRecord) => {
    modal.confirm({
      title: `Remove "${record.name}"?`,
      content: "This vendor profile will be removed from the platform catalog.",
      okText: "Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteProfile(record.id);
          message.success("Profile removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to remove profile"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={ClusterOutlined} />

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
            RADIUS vendor capability profiles — define which FreeRADIUS attributes each NAS
            vendor/model supports. Used by WiFi sites and plan RADIUS policies.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load vendor profiles"
            description={String(error)}
          />
        ) : null}

        <div className="flex flex-col gap-4">
          <WifiOrgScopeBar
            memberships={memberships}
            orgId={orgId}
            showOrgSwitcher={showOrgSwitcher}
            needsOrg={needsOrg}
            loading={loading}
            onSelectOrg={selectOrg}
          />

          {contextReady ? (
            <>
              <VendorProfilesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <VendorProfilesToolbar
                  search={search}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onRefresh={refresh}
                  onAdd={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <VendorProfilesTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openView}
                  onEdit={(r) => void openEdit(r)}
                  onDelete={handleDelete}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <VendorProfileFormDrawer
        open={formOpen}
        saving={saving}
        editing={editing}
        catalog={catalog}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <VendorProfileDetailDrawer
        open={detailOpen}
        profileId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
        onEdit={(p) => void openEdit(p)}
        loadProfile={loadProfile}
      />
    </div>
  );
};

export default NetworkRadiusVendorProfilesPage;
