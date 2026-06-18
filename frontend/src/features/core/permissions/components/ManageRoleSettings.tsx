"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Segmented,
  Select,
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
  KeyOutlined,
  ClearOutlined,
  PlusOutlined,
  FormOutlined,
  AppstoreOutlined,
  MenuOutlined,
  BorderOutlined,
  ThunderboltOutlined,
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
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";
import {
  revalidateTranslations,
  revalidateAppSettings,
} from "@/app/actions/revalidate";

const { Text } = Typography;

type SettingKind = "menuGroup" | "menu" | "button" | "feature";

const MANUAL_KINDS: SettingKind[] = ["button", "feature"];
const MENU_DERIVED_KINDS: SettingKind[] = ["menuGroup", "menu"];

type KindFilter = "manual" | "all" | SettingKind;

const ManageRoleSettings = ({ activeKey }: { activeKey: string }) => {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const useCaseSource = MainUseCase.useManagement();
  const dataList = useCaseSource.mngRoleSettingsList;
  const pagination = useCaseSource.mngRoleSettingsPagination;
  const loading = useCaseSource.loading;

  const createFn = useCaseSource.createMngRoleSetting;
  const updateFn = useCaseSource.updateMngRoleSetting;
  const fetchFn = useCaseSource.fetchMngRoleSettings;
  const deleteFn = useCaseSource.deleteMngRoleSetting;

  const [editingKey, setEditingKey] = useState<any | null>(null);
  const [tableState, setTableState] = useState<any | null>(null);
  const [searchWords, setSearchWords] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("manual");

  const t = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");
  const t_delete = useTranslations("modals.delete");
  const safeMenuTranslate = useSafeMenuTranslate();

  const kindMeta = useMemo(
    () =>
      ({
        menuGroup: {
          label: t("kindMenuGroup"),
          color: "purple",
          icon: <AppstoreOutlined />,
        },
        menu: {
          label: t("kindMenu"),
          color: "blue",
          icon: <MenuOutlined />,
        },
        button: {
          label: t("kindButton"),
          color: "geekblue",
          icon: <BorderOutlined />,
        },
        feature: {
          label: t("kindFeature"),
          color: "green",
          icon: <ThunderboltOutlined />,
        },
      }) satisfies Record<
        SettingKind,
        { label: string; color: string; icon: React.ReactNode }
      >,
    [t]
  );

  const filter = useMemo(() => {
    const base: Record<string, unknown> = {
      ...tableState,
      search: searchWords || undefined,
    };
    if (kindFilter === "manual") {
      base.excludeKinds = MENU_DERIVED_KINDS.join(",");
    } else if (kindFilter !== "all") {
      base.kind = kindFilter;
    }
    return base;
  }, [searchWords, tableState, kindFilter]);

  useEffect(() => {
    if (activeKey === "permissions") {
      fetchFn("", filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeKey]);

  const isEditing = (record: any) => record?.id === editingKey?.id;

  const edit = (record: any) => {
    form.setFieldsValue({
      ...record,
      kind: record?.kind ?? "feature",
    });
    setEditingKey(record);
  };

  const isMenuDerived = (record: any): boolean =>
    MENU_DERIVED_KINDS.includes(record?.kind as SettingKind);

  const cancel = () => {
    form.resetFields();
    setEditingKey(null);
  };

  const handleRevalidateTranslations = async () => {
    await revalidateTranslations();
    message.success("Cache Updated");
  };

  const handleSubmit = async () => {
    try {
      const row = await form.validateFields();
      if (editingKey) {
        const payload: Record<string, unknown> = { ...row };
        // Menu-derived rows are owned by the menu module; allow description only.
        if (isMenuDerived(editingKey)) {
          delete payload.kind;
          delete payload.settingKey;
        }
        updateFn(editingKey?.id, payload);
        message.success("Edited successfully");
      } else {
        createFn({ ...row, kind: row.kind ?? "feature" });
        message.success("Added successfully");
      }
      cancel();
      fetchFn("", filter);
      await handleRevalidateTranslations();
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
    const menuDerived = isMenuDerived(record);
    if (editable) {
      return (
        <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel}>
          {buttonTexts("cancel")}
        </Button>
      );
    }
    return (
      <Space size={0}>
        <Tooltip
          title={
            menuDerived
              ? "Managed by Menu Management — only description is editable"
              : buttonTexts("edit")
          }
        >
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          />
        </Tooltip>
        <Tooltip
          title={
            menuDerived
              ? "Synced from menu — delete from Menu Management"
              : buttonTexts("delete")
          }
        >
          <Button
            type="text"
            size="small"
            danger
            disabled={menuDerived}
            icon={<DeleteOutlined />}
            onClick={() => !menuDerived && handleConfirm(record)}
          />
        </Tooltip>
      </Space>
    );
  };

  const renderKindTag = (rawKind?: string) => {
    const k = (rawKind ?? "feature") as SettingKind;
    const meta = kindMeta[k] ?? kindMeta.feature;
    return (
      <Tag color={meta.color} icon={meta.icon} style={{ margin: 0 }}>
        {meta.label}
      </Tag>
    );
  };

  const columnConfig: ConfiguredColumn = [
    {
      key: "settingKey",
      title: (
        <span>
          <KeyOutlined style={{ marginRight: 6 }} />
          {t("settingKey")}
        </span>
      ),
      visible: true,
      render: (txt: string) => (
        <Tag
          color="blue"
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            margin: 0,
            fontSize: 12,
          }}
        >
          {txt}
        </Tag>
      ),
    },
    {
      key: "kind",
      title: t("settingKind"),
      visible: true,
      render: (_: any, r: any) => renderKindTag(r.kind),
    },
    {
      key: "description",
      title: t("description"),
      visible: true,
      render: (_: any, r: any) => (
        <Text>{safeMenuTranslate(r.description) || r.description}</Text>
      ),
    },
    { key: "createdAt", title: t("createdAt"), visible: true, isDate: true },
    { key: "updatedAt", title: t("updatedAt"), visible: true, isDate: true },
    { title: t("action"), visible: true, isAction: true },
  ];

  const columns = generateColumns(columnConfig, renderActions);

  const key = Form.useWatch("settingKey", form);
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
                  ? `${buttonTexts("edit")} ${t("settingKey")}`
                  : `${buttonTexts("add")} ${t("settingKey")}`}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {editingKey
                    ? `${t("settingKey")}: ${editingKey?.settingKey}`
                    : t("pleaseInputSettingKey")}
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
            initialValues={{ kind: "feature" }}
          >
            <Form.Item
              name="settingKey"
              label={t("settingKey")}
              rules={[
                {
                  required: true,
                  message: t("pleaseInputSettingKey"),
                },
              ]}
            >
              <Input
                size="middle"
                disabled={editingKey && isMenuDerived(editingKey)}
                prefix={<KeyOutlined style={{ color: token.colorTextTertiary }} />}
                placeholder={t("pleaseInputSettingKey")}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="kind"
              label={t("settingKind")}
              rules={[{ required: true, message: t("pleaseChooseSettingKind") }]}
              tooltip="Buttons and Features are managed here. Menu Groups and Menus are synced from Menu Management."
            >
              <Select
                size="middle"
                disabled={editingKey && isMenuDerived(editingKey)}
                options={MANUAL_KINDS.map((k) => ({
                  value: k,
                  label: (
                    <Space>
                      {kindMeta[k].icon}
                      <span>{kindMeta[k].label}</span>
                    </Space>
                  ),
                }))}
              />
            </Form.Item>

            <Form.Item name="description" label={t("description")}>
              <Input.TextArea
                placeholder="Briefly describe what this permission controls"
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
                loading={
                  loading.createMngRoleSetting || loading.updateMngRoleSetting
                }
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
              <Text strong style={{ fontSize: 15 }}>
                {t("managePermissions")}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {pagination.totalRows} {t("settingKey")}
                  {pagination.totalRows === 1 ? "" : "s"}
                </Text>
              </div>
            </div>
            <Space wrap>
              <Segmented
                value={kindFilter}
                onChange={(val) => setKindFilter(val as KindFilter)}
                options={[
                  { value: "manual", label: t("kindFilterManual") },
                  {
                    value: "button",
                    label: (
                      <span>
                        {kindMeta.button.icon} {kindMeta.button.label}
                      </span>
                    ),
                  },
                  {
                    value: "feature",
                    label: (
                      <span>
                        {kindMeta.feature.icon} {kindMeta.feature.label}
                      </span>
                    ),
                  },
                  { value: "all", label: t("kindFilterAll") },
                ]}
              />
              <Input.Search
                allowClear
                placeholder={t("search")}
                onSearch={(value) => setSearchWords(value || "")}
                style={{ width: 240 }}
              />
            </Space>
          </div>

          <MasterTable
            title={""}
            dataSource={dataList}
            onStateChange={setTableState}
            totalCount={pagination.totalRows}
            loading={loading.fetchMngRoleSettings}
            columns={columns}
            renderActions={renderActions}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default ManageRoleSettings;
