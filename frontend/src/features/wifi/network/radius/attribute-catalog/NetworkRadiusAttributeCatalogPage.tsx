"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, theme } from "antd";
import { BookOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import WifiOrgScopeBar from "@/features/wifi/shared/components/WifiOrgScopeBar";
import { useNetworkRadiusAttributeCatalog } from "./useNetworkRadiusAttributeCatalog";
import type { AttributeFormValues, CatalogAttributeRecord, RadiusAttrValueType } from "./types";
import AttributeCatalogStats from "./components/AttributeCatalogStats";
import AttributeCatalogToolbar from "./components/AttributeCatalogToolbar";
import AttributeCatalogTable from "./components/AttributeCatalogTable";
import AttributeFormDrawer from "./components/AttributeFormDrawer";



const NetworkRadiusAttributeCatalogPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogAttributeRecord | null>(null);
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
    createAttribute,
    updateAttribute,
    deleteAttribute,
    orgId,
    selectOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
    memberships,
  } = useNetworkRadiusAttributeCatalog();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: CatalogAttributeRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: AttributeFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updateAttribute(editing.id, values);
        message.success("Attribute updated");
      } else {
        await createAttribute(values);
        message.success("Attribute added to catalog");
      }
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to save attribute"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: CatalogAttributeRecord) => {
    modal.confirm({
      title: `Remove "${record.freeradiusName}"?`,
      content: "This attribute will be removed from the platform catalog.",
      okText: "Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteAttribute(record.id);
          message.success("Attribute removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to remove attribute"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={BookOutlined} />

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
            message="Failed to load attribute catalog"
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
              <AttributeCatalogStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <AttributeCatalogToolbar
                  search={search}
                  valueType={(params.valueType as RadiusAttrValueType) ?? null}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onValueTypeChange={(valueType) =>
                    patchParams({ valueType: valueType ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onAdd={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <AttributeCatalogTable
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

      <AttributeFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NetworkRadiusAttributeCatalogPage;
