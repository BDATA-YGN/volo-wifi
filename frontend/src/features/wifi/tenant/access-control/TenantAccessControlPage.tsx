"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { Alert, App, Card, Typography, theme } from "antd";
import { Shield } from "lucide-react";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import OrgSwitcher from "../profile/components/OrgSwitcher";
import { needsOrgSelection, shouldShowOrgSwitcher } from "@/features/wifi/shared/hooks/useWifiOrgScope";
import { useTenantAccessControl } from "./useTenantAccessControl";
import type { MemberCreateFormValues, MemberRoleCode, MemberStatus, OrgMemberRecord } from "./types";
import AccessControlStats from "./components/AccessControlStats";
import AccessControlToolbar from "./components/AccessControlToolbar";
import MembersTable from "./components/MembersTable";
import MemberFormDrawer from "./components/MemberFormDrawer";
import MemberDetailDrawer from "./components/MemberDetailDrawer";
import ResetPasswordModal from "./components/ResetPasswordModal";

const { Paragraph } = Typography;

const TenantAccessControlPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearchLocal] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editing, setEditing] = useState<OrgMemberRecord | null>(null);
  const [selected, setSelected] = useState<OrgMemberRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<OrgMemberRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
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
    loadMember,
    createMember,
    updateMember,
    removeMember,
    resetMemberPassword,
  } = useTenantAccessControl();

  useEffect(() => {
    void loadFormOptions().then(() => setInitDone(true));
  }, [loadFormOptions]);

  // Tenant accounts with a single membership auto-scope. Developers must pick.
  useEffect(() => {
    if (!initDone || orgId) return;
    const canSwitch = meta?.canSwitchOrg ?? formOptions.canSwitchOrg;
    const requires = meta?.requiresOrgSelection ?? formOptions.requiresOrgSelection;
    if (canSwitch || requires) return;
    if ((meta?.memberships ?? formOptions.memberships).length === 1) {
      selectOrg((meta?.memberships ?? formOptions.memberships)[0].id);
    }
  }, [
    initDone,
    meta?.memberships,
    meta?.requiresOrgSelection,
    meta?.canSwitchOrg,
    formOptions.memberships,
    formOptions.canSwitchOrg,
    formOptions.requiresOrgSelection,
    orgId,
    selectOrg,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, setSearch]);

  const memberships = meta?.memberships ?? formOptions.memberships;
  const orgScopeMeta = {
    canSwitchOrg: meta?.canSwitchOrg ?? formOptions.canSwitchOrg,
    requiresOrgSelection: meta?.requiresOrgSelection ?? formOptions.requiresOrgSelection,
  };
  const showSwitcher = shouldShowOrgSwitcher(memberships, orgScopeMeta);
  const needsOrg = needsOrgSelection(orgId, orgScopeMeta, memberships.length);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: OrgMemberRecord) => {
    setEditing(record);
    setDetailOpen(false);
    setDrawerOpen(true);
  };

  const openDetail = (record: OrgMemberRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleCreate = async (values: MemberCreateFormValues) => {
    setSaving(true);
    try {
      await createMember({
        ...values,
        isPrimary: false,
        roleCodes: [values.roleCode],
      });
      message.success("Team member provisioned");
      setDrawerOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to provision member"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, values: MemberCreateFormValues) => {
    setSaving(true);
    try {
      await updateMember(id, {
        title: values.title,
        status: values.status,
        isPrimary: values.roleCode === "ORG_ADMIN" ? values.isPrimary : false,
        roleCodes: [values.roleCode],
        stationIds: values.stationIds,
        ...(values.password ? { password: values.password } : {}),
      });
      message.success("Member updated");
      setDrawerOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to update member"));
    } finally {
      setSaving(false);
    }
  };

  const openResetPassword = (record: OrgMemberRecord) => {
    setResetTarget(record);
    setResetOpen(true);
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    setResetSaving(true);
    try {
      await resetMemberPassword(resetTarget.id, password);
      message.success("Password updated");
      setResetOpen(false);
      setResetTarget(null);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to reset password"));
    } finally {
      setResetSaving(false);
    }
  };

  const handleRemove = (record: OrgMemberRecord) => {
    modal.confirm({
      title: `Remove ${record.admin.fullName}?`,
      content: "Membership and role assignments will be revoked. The console account is kept.",
      okText: "Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await removeMember(record.id);
          message.success("Member removed");
        } catch (err: unknown) {
          message.error(getApiErrorMessage(err, "Failed to remove member"));
        }
      },
    });
  };

  return (
    <div className="p-0">
      <CommonHeader icon={Shield} />

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
            Provision internal console accounts for your organization — create or link admins,
            assign membership roles, and optionally restrict access to specific sites.
          </Paragraph>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="Failed to load access control"
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
              title="Select an organization"
              description="Choose a tenant to manage team access."
            />
          ) : null}

          {orgId ? (
            <>
              <AccessControlStats meta={meta} loading={loading} />

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <AccessControlToolbar
                  search={search}
                  status={(params.status as MemberStatus) ?? null}
                  roleCode={(params.roleCode as MemberRoleCode) ?? null}
                  loading={loading}
                  onSearchChange={setSearchLocal}
                  onStatusChange={(status) =>
                    patchParams({ status: status ?? undefined, page: 1 })
                  }
                  onRoleCodeChange={(roleCode) =>
                    patchParams({ roleCode: roleCode ?? undefined, page: 1 })
                  }
                  onRefresh={refresh}
                  onAdd={openCreate}
                />
              </Card>

              <Card
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <MembersTable
                  data={list}
                  loading={loading}
                  page={params.page ?? 1}
                  pageSize={params.limit ?? 20}
                  total={meta?.total ?? 0}
                  onPaginationChange={setPagination}
                  onView={openDetail}
                  onEdit={openEdit}
                  onResetPassword={openResetPassword}
                  onRemove={handleRemove}
                />
              </Card>
            </>
          ) : initDone && memberships.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              title="No organization access"
              description="Your account is not linked to a tenant. Contact a platform administrator."
            />
          ) : null}
        </div>
      </div>

      <MemberFormDrawer
        open={drawerOpen}
        saving={saving}
        editing={editing}
        formOptions={formOptions}
        onClose={closeDrawer}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <MemberDetailDrawer
        open={detailOpen}
        memberId={selected?.id ?? null}
        fallback={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onEdit={openEdit}
        loadMember={loadMember}
      />

      <ResetPasswordModal
        open={resetOpen}
        saving={resetSaving}
        member={resetTarget}
        onClose={() => {
          setResetOpen(false);
          setResetTarget(null);
        }}
        onSubmit={handleResetPassword}
      />
    </div>
  );
};

export default TenantAccessControlPage;
