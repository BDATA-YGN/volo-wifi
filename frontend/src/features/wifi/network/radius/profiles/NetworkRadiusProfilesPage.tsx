"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, theme } from "antd";
import { KeyOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusProfiles } from "./useNetworkRadiusProfiles";
import type { RadiusProfileFormValues, RadiusProfileRecord } from "./types";
import RadiusProfilesStats from "./components/RadiusProfilesStats";
import RadiusProfilesToolbar from "./components/RadiusProfilesToolbar";
import RadiusProfilesTable from "./components/RadiusProfilesTable";
import RadiusProfileFormDrawer from "./components/RadiusProfileFormDrawer";



const NetworkRadiusProfilesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RadiusProfileRecord | null>(null);
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
    createProfile,
    updateProfile,
    deleteProfile,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
  } = useNetworkRadiusProfiles();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: RadiusProfileRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: RadiusProfileFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...values };
        if (!payload.sharedSecret?.trim()) delete payload.sharedSecret;
        await updateProfile(editing.id, payload);
        message.success("FreeRADIUS server updated");
      } else {
        await createProfile(values);
        message.success("FreeRADIUS server created");
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (err) {
      message.error(getApiErrorMessage(err, "Failed to save FreeRADIUS server"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: RadiusProfileRecord) => {
    modal.confirm({
      title: `Delete "${record.name}"?`,
      content: record._count.devices
        ? `This server is used by ${record._count.devices} device(s). Unlink them first.`
        : "This cannot be undone.",
      okText: "Delete",
      okType: "danger",
      okButtonProps: { disabled: record._count.devices > 0 },
      onOk: async () => {
        try {
          await deleteProfile(record.id);
          message.success("FreeRADIUS server deleted");
        } catch (err) {
          message.error(getApiErrorMessage(err, "Failed to delete FreeRADIUS server"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={KeyOutlined} />

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
            message="Failed to load FreeRADIUS servers"
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
              <RadiusProfilesStats
                total={meta?.total ?? list.length}
                activeCount={meta?.activeCount ?? list.filter((r) => r.isActive).length}
              />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RadiusProfilesToolbar
                  search={search}
                  onSearchChange={setSearchLocal}
                  onRefresh={() => void refresh()}
                  onAdd={openCreate}
                  loading={loading}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <RadiusProfilesTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <RadiusProfileFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NetworkRadiusProfilesPage;
