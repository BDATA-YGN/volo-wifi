"use client";

import React, { useEffect, useMemo, useState } from "react";
import { App, Card, Space, Tag, theme } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";

import * as PermissionUseCase from "@/features/core/permissions/usePermission";
import { useAuthStore } from "@/features/core/auth/store";

import { useAdmin } from "./useAdmin";
import AdminUsersToolbar, {
  type AdminStatusFilter,
} from "./components/AdminUsersToolbar";
import AdminUsersTable from "./components/AdminUsersTable";
import AdminUserFormDrawer from "./components/AdminUserFormDrawer";
import type { AdminUserFormValues } from "./types";

const AdminUsersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const {
    list: dataList,
    pagination,
    loading,
    error,
    clearError,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    fetchAdmins,
  } = useAdmin();

  const {
    fetchMngRoles,
    mngRolesList,
    loading: permLoading,
  } = PermissionUseCase.useManagement();

  const { authData } = useAuthStore();

  const t = useTranslations("permissions");
  const t_delete = useTranslations("modals.delete");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [tableState, setTableState] = useState<Record<string, unknown> | null>(null);
  const [searchWords, setSearchWords] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all");
  const [saving, setSaving] = useState(false);

  const filter = useMemo(
    () => ({
      ...tableState,
      search: searchWords || undefined,
      roleId: roleFilter,
      isActive:
        statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    }),
    [searchWords, tableState, roleFilter, statusFilter]
  );

  /** Defensive client-side filter so the UI works even when the API ignores params. */
  const displayedList = useMemo(() => {
    const term = (searchWords ?? "").trim().toLowerCase();
    return dataList.filter((row: Record<string, unknown>) => {
      if (roleFilter !== undefined && row.roleId !== roleFilter) return false;
      if (statusFilter === "active" && row.isActive !== true) return false;
      if (statusFilter === "inactive" && row.isActive === true) return false;
      if (term) {
        const haystack = [
          row.fullName,
          row.username,
          row.email,
          row.phoneNumber,
        ]
          .filter(Boolean)
          .map(String)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [dataList, searchWords, roleFilter, statusFilter]);

  useEffect(() => {
    void fetchMngRoles("", { take: 100, skip: 0, page: 1, limit: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchAdmins(filter).catch(() => message.error("Failed to fetch admins"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (error) {
      message.error(getApiErrorMessage(error, "Request failed"));
      clearError();
    }
  }, [error, message, clearError]);

  const openCreate = () => {
    setEditingRecord(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (values: AdminUserFormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      delete payload.confirmPassword;
      delete payload.emailAccountId;
      if (!payload.password || String(payload.password).trim() === "") {
        delete payload.password;
      }
      const email = String(payload.email ?? "").trim();
      payload.email = email || null;
      payload.createdBy = authData?.id;

      if (editingRecord) {
        await updateAdmin({ id: String(editingRecord.id), payload });
        message.success("Administrator updated");
      } else {
        await createAdmin({ payload });
        message.success("Administrator created");
      }
      setDrawerOpen(false);
      setEditingRecord(null);
      void fetchAdmins(filter);
    } catch {
      message.error(
        editingRecord ? "Failed to update administrator" : "Failed to create administrator"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: { id?: string }) => {
    try {
      await deleteAdmin({ id: String(record?.id) });
      void fetchAdmins(filter);
      message.success("Administrator deleted");
    } catch {
      message.error("Failed to delete administrator");
    }
  };

  const handleConfirmDelete = (record: { id?: string }) => {
    modal.confirm({
      title: t_delete("title"),
      content: t_delete("content"),
      okText: t_delete("okText"),
      cancelText: t_delete("cancelText"),
      onOk: () => handleDelete(record),
    });
  };

  return (
    <>
      <Card
        variant="borderless"
        title={
          <Space>
            <TeamOutlined style={{ color: token.colorPrimary }} />
            <span style={{ fontWeight: 600 }}>Administrators</span>
            <Tag>{displayedList.length}</Tag>
          </Space>
        }
        extra={
          <AdminUsersToolbar
            loading={loading}
            searchPlaceholder={t("search")}
            searchValue={searchWords ?? ""}
            onSearch={(value) => setSearchWords(value)}
            roles={mngRolesList as Array<{ roleId: number; roleName: string }>}
            rolesLoading={!!permLoading?.fetchMngRoles}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onRefresh={() => void fetchAdmins(filter)}
            onAdd={openCreate}
          />
        }
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <AdminUsersTable
          dataList={displayedList}
          loading={loading}
          totalRows={displayedList.length}
          onStateChange={setTableState}
          roles={mngRolesList as Array<{ roleId: number; roleName: string }>}
          onEdit={openEdit}
          onDelete={handleConfirmDelete}
        />
      </Card>

      <AdminUserFormDrawer
        open={drawerOpen}
        editingRecord={editingRecord}
        saving={saving}
        rolesLoading={!!permLoading?.fetchMngRoles}
        roles={mngRolesList as Array<{ roleId: number; roleName: string }>}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default AdminUsersPage;
