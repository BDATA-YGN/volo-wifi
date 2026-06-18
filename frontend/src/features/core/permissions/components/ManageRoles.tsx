"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  ClearOutlined,
  NumberOutlined,
  PlusOutlined,
  FormOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { v4 as uuid } from "uuid";

import MasterTable from "@/common/components/Tables/MasterTable";
import {
  ConfiguredColumn,
  generateColumns,
} from "@/common/components/Tables/columnUtils";

import * as MainUseCase from "@/features/core/permissions/usePermission";

const { Text } = Typography;

const ManageRoles = ({ activeKey }: { activeKey: string }) => {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const useCaseSource = MainUseCase.useManagement();
  const dataList = useCaseSource.mngRolesList;
  const pagination = useCaseSource.mngRolesPagination;
  const loading = useCaseSource.loading;

  const createFn = useCaseSource.createMngRole;
  const updateFn = useCaseSource.updateMngRole;
  const fetchFn = useCaseSource.fetchMngRoles;
  const deleteFn = useCaseSource.deleteMngRole;

  const [editingKey, setEditingKey] = useState<any | null>(null);
  const [tableState, setTableState] = useState<any | null>(null);
  const [searchWords, setSearchWords] = useState<string | null>(null);

  const t = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");
  const t_delete = useTranslations("modals.delete");

  const filter = useMemo(
    () => ({
      ...tableState,
      search: searchWords || undefined,
    }),
    [searchWords, tableState]
  );

  useEffect(() => {
    if (activeKey === "roles") {
      fetchFn("", filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeKey]);

  const isEditing = (record: any) => record?.roleId === editingKey?.roleId;

  const edit = (record: any) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record);
  };

  const cancel = () => {
    form.resetFields();
    setEditingKey(null);
  };

  const handleSubmit = async () => {
    try {
      const row = await form.validateFields();
      if (editingKey) {
        updateFn(editingKey?.id, row);
        message.success("Edited successfully");
      } else {
        createFn(row);
        message.success("Added successfully");
      }
      cancel();
      fetchFn("", filter);
    } catch (err) {
      message.error(`Failed to ${editingKey ? "edit" : "add"}`);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      deleteFn(record?.id);
      fetchFn("", filter);
      message.success("Deleted successfully");
    } catch (err) {
      message.error("Failed to delete");
    }
  };

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
      <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>
        {buttonTexts("cancel")}
      </Button>
    ) : (
      <Space size={0}>
        <Tooltip title={buttonTexts("edit")}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          />
        </Tooltip>
        <Tooltip title={buttonTexts("delete")}>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleConfirm(record)}
          />
        </Tooltip>
      </Space>
    );
  };

  const columnConfig: ConfiguredColumn = [
    {
      key: "roleId",
      title: (
        <span>
          <NumberOutlined style={{ marginRight: 6 }} />
          {t("roleId")}
        </span>
      ),
      visible: true,
      render: (txt: any) => (
        <Tag color="geekblue" style={{ margin: 0 }}>
          ID&nbsp;{txt}
        </Tag>
      ),
    },
    {
      key: "roleName",
      title: t("roleName"),
      visible: true,
      render: (txt: string) => <Text strong>{txt}</Text>,
    },
    { key: "description", title: t("description"), visible: true },
    { key: "createdAt", title: t("createdAt"), visible: true, isDate: true },
    { key: "updatedAt", title: t("updatedAt"), visible: true, isDate: true },
    { title: t("action"), visible: true, isAction: true },
  ];

  const columns = generateColumns(columnConfig, renderActions);

  const key = Form.useWatch("roleId", form);
  const hasFormValues = !key;

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} md={10} lg={8} xl={7}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {editingKey ? <FormOutlined /> : <PlusOutlined />}
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {editingKey
                  ? `${buttonTexts("edit")} ${t("roleName")}`
                  : `${buttonTexts("add")} ${t("roleName")}`}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {editingKey
                    ? `${t("roleName")}: ${editingKey?.roleName}`
                    : t("manageRoles")}
                </Text>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              margin: "16px -20px 16px",
            }}
          />

          <Form
            form={form}
            name={uuid()}
            layout="vertical"
            onFinish={handleSubmit}
            scrollToFirstError
            requiredMark="optional"
          >
            <Form.Item
              name="roleId"
              label={t("roleId")}
              rules={[
                {
                  required: true,
                  message: t("pleaseInputRoleId"),
                },
              ]}
            >
              <Input
                type="number"
                disabled={!!editingKey}
                size="middle"
                prefix={
                  <NumberOutlined style={{ color: token.colorTextTertiary }} />
                }
                placeholder={t("pleaseInputRoleId")}
              />
            </Form.Item>

            <Form.Item
              name="roleName"
              label={t("roleName")}
              rules={[
                {
                  required: true,
                  message: t("pleaseInputRoleName"),
                },
              ]}
            >
              <Input
                size="middle"
                prefix={
                  <UserOutlined style={{ color: token.colorTextTertiary }} />
                }
                placeholder={t("pleaseInputRoleName")}
                allowClear
              />
            </Form.Item>

            <Form.Item name="description" label={t("description")}>
              <Input.TextArea
                placeholder="Describe this role and its responsibilities"
                rows={4}
                showCount
                maxLength={255}
              />
            </Form.Item>

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={editingKey ? <SaveOutlined /> : <PlusOutlined />}
                disabled={hasFormValues}
                loading={loading.createMngRole || loading.updateMngRole}
              >
                {editingKey ? buttonTexts("edit") : buttonTexts("add")}
              </Button>
              <Button
                type="default"
                onClick={cancel}
                icon={<ClearOutlined />}
                disabled={!editingKey && hasFormValues}
              >
                {buttonTexts("reset")}
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>

      <Col xs={24} md={14} lg={16} xl={17}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Space>
                <TeamOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 15 }}>
                  {t("manageRoles")}
                </Text>
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {pagination.totalRows} {t("roleName")}
                  {pagination.totalRows === 1 ? "" : "s"}
                </Text>
              </div>
            </div>
            <Input.Search
              allowClear
              placeholder={t("search")}
              onSearch={(value) => setSearchWords(value || "")}
              style={{ maxWidth: 280 }}
            />
          </div>

          <MasterTable
            title={""}
            dataSource={dataList}
            onStateChange={setTableState}
            totalCount={pagination.totalRows}
            loading={loading.fetchMngRoles}
            columns={columns}
            renderActions={renderActions}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default ManageRoles;
