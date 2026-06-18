"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button, Form, Input, App, Select, Tag, Switch } from "antd";
import { EditOutlined, DeleteOutlined, SaveOutlined, ClearOutlined, UserOutlined, CloseOutlined } from "@ant-design/icons";
import * as MainUseCase from "@/features/system/admin-users/useAdmin";
import * as PermissionUseCase from "@/features/core/permissions/usePermission";
// import * as EmailUseCase from "@/features/email/query";
import { ConfiguredColumn, generateColumns } from "@/common/components/Tables/columnUtils";
import { useTranslations } from "next-intl";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import FormItemBuilder from "@/common/components/Form/FormItemBuilder";
import MasterTable from "@/common/components/Tables/MasterTable";
import { v4 as uuid } from "uuid";
import { MngRolesAttributes } from "@/features/core/permissions/interface";
import { useAuthStore } from "@/features/core/auth/store";

interface AdminPageProps {
  activeKey: string;
  onHeaderExtraChange?: (buttons: React.ReactNode) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ activeKey, onHeaderExtraChange }) => {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const useCaseSource = MainUseCase.useAdmin();
  const { fetchMngRoles, mngRolesList } = PermissionUseCase.useManagement();
  const { authData } = useAuthStore();

  const dataList = useCaseSource.list;
  const pagination = useCaseSource.pagination;
  const loading = useCaseSource.loading;
  const error = useCaseSource.error;
  const clearError = useCaseSource.clearError;

  const createFn = useCaseSource.createAdmin;
  const updateFn = useCaseSource.updateAdmin;
  const fetchFn = useCaseSource.fetchAdmins;
  const deleteFn = useCaseSource.deleteAdmin;

  const [editingKey, setEditingKey] = useState<any | null>(null);
  const [tableState, setTableState] = useState<any | null>(null);
  const [searchWords, setSearchWords] = useState<string | null>(null);
  const [params, setParams] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [selectedEmailAccount, setSelectedEmailAccount] = useState<string | null>(null);

  const t = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");

  const fetchRoles = async () => {
    fetchMngRoles("", {
      take: 20,
      skip: 0,
      page: 1,
      limit: 20,
    });
  };

  const fetchEmailAccounts = async () => {
    try {
      // const response = await EmailUseCase.getEmailAccounts();
      // setEmailAccounts(response.data || []);
    } catch (error) {
      console.log('Failed to fetch email accounts:', error);
    }
  };

  const filter = useMemo(
    () => ({
      ...tableState,
      ...params,
      search: searchWords || undefined,
    }),
    [searchWords, tableState]
  );

  useEffect(() => {
    if (activeKey === "1") {
      fetchFn(filter).catch(() => message.error("Failed to fetch admins"));
      fetchRoles();
      fetchEmailAccounts();
    }
  }, [filter, activeKey, fetchFn, message]);

  useEffect(() => {
    if (error) {
      message.error(getApiErrorMessage(error, "Request failed"));
      clearError();
    }
  }, [error, message, clearError]);

  const isEditing = (record: any) => record?.id === editingKey?.id;

  const edit = (record: any) => {
    form.setFieldsValue({
      ...record,
      credentials: JSON.stringify(record?.credentials),
      isActive: record.isActive || false,
      isVerified: record.isVerified || false,
      isBlocked: record.isBlocked || false,
    });
    setSelectedRole(record.roleId);
    setSelectedEmailAccount(record.emailAccountId);
    setEditingKey(record);
  };

  const cancel = () => {
    form.resetFields();
    setEditingKey(null);
    setSelectedRole(null);
    setSelectedEmailAccount(null);
  };

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // No need to track form values for button disabling; handled by form state
  };

  const handleSubmit = async () => {
    try {
      const row = await form.validateFields();
      const payload = { ...row };
      delete payload.confirmPassword;
      payload.roleId = selectedRole;
      payload.emailAccountId = selectedEmailAccount;
      payload.createdBy = authData?.id;

      if (editingKey) {
        await updateFn({ id: editingKey?.id, payload });
        message.success("Edited successfully");
        cancel();
      } else {
        await createFn({ payload });
        message.success("Added successfully");
        cancel();
      }
      fetchFn(filter);
    } catch (err) {
      message.error(`Failed to ${editingKey ? "edit" : "add"}`);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await deleteFn({ id: record?.id });
      fetchFn(filter);
      message.success("Deleted successfully");
    } catch (err) {
      message.error("Failed to delete");
    }
  };

  const t_delete = useTranslations("modals.delete");
  const handleConfirm = async (record: any) => {
    modal.confirm({
      title: t_delete("title"),
      content: t_delete("content"),
      okText: t_delete("okText"),
      cancelText: t_delete("cancelText"),
      onOk: () => handleDelete(record),
    });
  };

  const renderActions = (record: any) => {
    const editable = isEditing(record);
    return editable ? (
      <span>
        <Button type="link" icon={<CloseOutlined />} onClick={cancel}>
          {buttonTexts("cancel")}
        </Button>
      </span>
    ) : (
      <span>
        <Button type="link" icon={<EditOutlined />} onClick={() => edit(record)}>
          {buttonTexts("edit")}
        </Button>
        <Button type="link" icon={<DeleteOutlined />} onClick={() => handleConfirm(record)}>
          {buttonTexts("delete")}
        </Button>
      </span>
    );
  };

  const validatePassword = (_: any, value: string) => {
    if (!value && !editingKey) {
      return Promise.reject("Please input your password!");
    }
    if (value && value.length < 8) {
      return Promise.reject("Password must be at least 8 characters long!");
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value && !editingKey) {
      return Promise.reject("Please confirm your password!");
    }
    if (value && value !== form.getFieldValue("password")) {
      return Promise.reject("The two passwords do not match!");
    }
    return Promise.resolve();
  };

  const columnConfig: ConfiguredColumn = [
    { key: "fullName", title: "Full Name", visible: true, icon: "username" },
    { key: "username", title: "Username", visible: true, icon: "username" },
    { key: "email", title: "Email", visible: true, icon: "email" },
    { key: "phoneNumber", title: "Phone Number", visible: true, icon: "phone" },
    {
      key: "roleId",
      title: "Role",
      visible: true,
      icon: "id",
      render: (text: any) => {
        const role = mngRolesList.find((role) => role.roleId === text);
        return <Tag color="magenta">{role?.roleName}</Tag>;
      },
    },
    {
      key: "emailAccountId",
      title: "Email Account",
      visible: true,
      render: (text: string) => {
        const account = emailAccounts.find((acc) => acc.id === text);
        return account ? <Tag color="blue">{account.email}</Tag> : <Tag color="default">No Account</Tag>;
      },
    },
    {
      key: "isActive",
      title: "Active",
      visible: true,
      render: (text: boolean) => (
        <Tag color={text ? "green" : "red"}>{text ? "Yes" : "No"}</Tag>
      ),
    },
    { title: t("action"), visible: true, isAction: true, icon: "action" },
  ];

  const columns = generateColumns(columnConfig, renderActions);

  const key = Form.useWatch("username", form);
  const hasFormValues = !key;

  useEffect(() => {
    if (onHeaderExtraChange) {
      onHeaderExtraChange(
        <div className="flex gap-2 items-center">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            disabled={hasFormValues}
          >
            {editingKey ? buttonTexts("edit") : buttonTexts("add")}
          </Button>
          <Button
            type="default"
            onClick={cancel}
            icon={<ClearOutlined />}
            disabled={hasFormValues}
          >
            {buttonTexts("reset")}
          </Button>
        </div>
      );
    }
  }, [editingKey, hasFormValues, form, onHeaderExtraChange, buttonTexts]);

  return (
    <div className="p-1">
      <Form
        form={form}
        name={uuid()}
        layout="vertical"
        onFinish={handleSubmit}
        className="mb-4"
        scrollToFirstError
        onValuesChange={handleFormValuesChange}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          <FormItemBuilder
            name="fullName"
            label="Full Name"
            required={true}
            inputType="text"
            placeholder="Enter Full Name"
            icon="username"
          />
          <FormItemBuilder
            name="username"
            label="Username"
            required={true}
            inputType="text"
            icon="username"
            placeholder="Enter Username"
          />
          <FormItemBuilder
            name="email"
            label="Email"
            required={false}
            inputType="text"
            placeholder="Enter Email"
            icon="email"
          />
          <FormItemBuilder
            name="phoneNumber"
            label="Phone Number"
            required={false}
            inputType="text"
            placeholder="Enter Phone Number"
            icon="phone"
          />
          <Form.Item label={t("selectRole")} name="roleId" required={true}>
            <Select
              value={selectedRole}
              placeholder={t("selectRolePlaceholder")}
              onChange={setSelectedRole}
              className="w-full"
              loading={loading}
              disabled={loading}
              options={mngRolesList.map((role) => ({
                value: role.roleId,
                label: role.roleName,
              }))}
            />
          </Form.Item>
          <Form.Item label="Email Account" name="emailAccountId">
            <Select
              value={selectedEmailAccount}
              placeholder="Select Email Account"
              onChange={setSelectedEmailAccount}
              className="w-full"
              loading={loading}
              disabled={loading}
              allowClear
              options={emailAccounts.map((account) => ({
                value: account.id,
                label: account.email,
              }))}
            />
          </Form.Item>
          <FormItemBuilder
            name="password"
            label="Password"
            required={!editingKey}
            inputType="password"
            placeholder="Enter password"
            icon="password"
            rules={[{ validator: validatePassword }]}
          />
          <FormItemBuilder
            name="confirmPassword"
            label="Confirm Password"
            required={!editingKey}
            inputType="password"
            placeholder="Enter Confirm Password"
            icon="password"
            dependencies={["password"]}
            rules={[{ validator: validateConfirmPassword }]}
          />
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isVerified" label="Verified" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isBlocked" label="Blocked" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
      <MasterTable
        title={""}
        extra={
          <Input.Search allowClear placeholder={t("search")} onSearch={(value) => setSearchWords(value || "")} />
        }
        dataSource={dataList.map((item: any, index: any) => ({
          ...item,
          key: item.id || `item-${index}`,
        }))}
        onStateChange={setTableState}
        totalCount={pagination.totalRows}
        loading={loading}
        columns={columns}
        renderActions={renderActions}
      />
    </div>
  );
};

export default AdminPage;