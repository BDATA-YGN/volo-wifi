"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, theme } from "antd";
import { Handshake } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "@/features/wifi/tenant/profile/components/OrgSwitcher";
import { useCommercePartners } from "./useCommercePartners";
import type { PartnerDetail, PartnerFormValues, PartnerRecord, PartnerStatus } from "./types";
import PartnersStats from "./components/PartnersStats";
import PartnersToolbar from "./components/PartnersToolbar";
import PartnersTable from "./components/PartnersTable";
import PartnerFormDrawer from "./components/PartnerFormDrawer";
import PartnerDetailDrawer from "./components/PartnerDetailDrawer";
import PartnerResetPasswordModal from "./components/PartnerResetPasswordModal";

const CommercePartnersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerDetail | null>(null);
  const [selected, setSelected] = useState<PartnerRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<PartnerRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
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
    loadPartner,
    createPartner,
    updatePartner,
    removePartner,
    resetPartnerPassword,
  } = useCommercePartners();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  useEffect(() => {
    // Multi-org: wait for explicit OrgSwitcher selection.
    // Single-org is hydrated inside loadFormOptions (with stations/plans).
    if (initDone && !orgId && formOptions.memberships.length === 1) {
      selectOrg(formOptions.memberships[0].id);
    }
  }, [initDone, formOptions.memberships, orgId, selectOrg]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const showSwitcher = memberships.length > 1;
  const needsOrg = initDone && !orgId && memberships.length > 1;

  const openCreate = () => {
    setEditing(null);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openEdit = async (record: PartnerRecord | PartnerDetail) => {
    setDetailOpen(false);
    setSaving(true);
    try {
      const detail = await loadPartner(record.id);
      setEditing(detail);
      setDrawerOpen(true);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to load partner"));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (record: PartnerRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleCreate = async (values: PartnerFormValues) => {
    setSaving(true);
    try {
      await createPartner(values);
      message.success("Partner and login account created");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to create partner"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, values: PartnerFormValues) => {
    setSaving(true);
    try {
      await updatePartner(id, values);
      message.success("Partner updated");
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update partner"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: PartnerRecord) => {
    modal.confirm({
      title: `Delete partner "${record.code}"?`,
      content:
        "Soft-deletes the partner record. Partners with credentials or sales cannot be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await removePartner(record.id);
          message.success("Partner removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to delete partner"));
        }
      },
    });
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await resetPartnerPassword(resetTarget.id, password);
      message.success("Password updated");
      setResetTarget(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to reset password"));
      throw err;
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Handshake} />

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
            title="Failed to load partners"
            description={getApiErrorMessage(error, "Failed to load partners")}
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
              description="Choose a tenant to manage its partners."
            />
          ) : null}

          {orgId ? (
            <>
              <PartnersStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PartnersToolbar
                  search={search}
                  status={(params.status as PartnerStatus) ?? null}
                  stationId={(params.stationId as string) ?? null}
                  formOptions={formOptions}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onStationChange={(stationId) =>
                    patchParams({ stationId: stationId ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onCreate={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <PartnersTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onEdit={(record) => void openEdit(record)}
                  onResetPassword={setResetTarget}
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

      <PartnerFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        formOptions={formOptions}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <PartnerDetailDrawer
        open={detailOpen}
        partnerId={selected?.id ?? null}
        fallback={selected}
        availablePlans={formOptions.plans}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onEdit={(record) => void openEdit(record)}
        loadPartner={loadPartner}
      />

      <PartnerResetPasswordModal
        open={Boolean(resetTarget)}
        saving={resetting}
        partner={resetTarget}
        onClose={() => {
          if (resetting) return;
          setResetTarget(null);
        }}
        onSubmit={handleResetPassword}
      />
    </div>
  );
};

export default CommercePartnersPage;
