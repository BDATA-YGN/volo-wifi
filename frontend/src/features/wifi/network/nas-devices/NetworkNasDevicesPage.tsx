"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, Typography, theme } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkNasDevices } from "./useNetworkNasDevices";
import type { DeviceType, NasDeviceFormValues, NasDeviceRecord } from "./types";
import NasDevicesStats from "./components/NasDevicesStats";
import NasDevicesToolbar from "./components/NasDevicesToolbar";
import NasDevicesTable from "./components/NasDevicesTable";
import NasDeviceFormDrawer from "./components/NasDeviceFormDrawer";

const { Paragraph } = Typography;

const NetworkNasDevicesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [orgs, setOrgs] = useState<{ id: string; code: string; name: string; isActive: boolean }[]>(
    []
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<NasDeviceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    list,
    meta,
    loading,
    error,
    params,
    orgId,
    refresh,
    setSearch,
    setPagination,
    patchParams,
    loadFormOptions,
    createDevice,
    updateDevice,
    deleteDevice,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
    canSwitchOrg,
  } = useNetworkNasDevices();

  useEffect(() => {
    if (!orgId) return;
    void loadFormOptions(orgId).then((data) => setOrgs(data.orgs));
  }, [loadFormOptions, orgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: NasDeviceRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: NasDeviceFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updateDevice(editing.id, values);
        message.success("NAS device updated");
      } else {
        await createDevice({ ...values, orgId: values.orgId || orgId! });
        message.success("NAS device added");
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save device"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: NasDeviceRecord) => {
    const label = [record.vendor, record.model].filter(Boolean).join(" ") || record.type;
    modal.confirm({
      title: `Remove "${label}"?`,
      content: "The device will be removed from inventory. This cannot be undone.",
      okText: "Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteDevice(record.id);
          message.success("Device removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to remove device"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={CloudServerOutlined} />

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
            Central inventory for routers, access points, and RADIUS NAS clients across tenant WiFi
            sites. Link devices to sites and configure FreeRADIUS attributes.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load NAS devices"
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
              <NasDevicesStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <NasDevicesToolbar
                  orgs={orgs}
                  search={search}
                  orgId={orgId ?? null}
                  showOrgFilter={showOrgSwitcher}
                  type={(params.type as DeviceType) ?? null}
                  radiusOnly={params.isRadiusClient === true}
                  unassignedOnly={params.unassigned === true}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onOrgChange={(nextOrgId) =>
                    patchParams({ orgId: nextOrgId ?? undefined, page: 1 })
                  }
                  onTypeChange={(type) => patchParams({ type: type ?? undefined, page: 1 })}
                  onRadiusOnlyChange={(value) =>
                    patchParams({
                      isRadiusClient: value ? true : undefined,
                      page: 1,
                    })
                  }
                  onUnassignedOnlyChange={(value) =>
                    patchParams({ unassigned: value ? true : undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onAdd={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <NasDevicesTable
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

      <NasDeviceFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        orgs={orgs}
        lockedOrgId={canSwitchOrg ? undefined : orgId}
        loadStations={(targetOrgId) => loadFormOptions(targetOrgId).then((d) => d.stations)}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NetworkNasDevicesPage;
