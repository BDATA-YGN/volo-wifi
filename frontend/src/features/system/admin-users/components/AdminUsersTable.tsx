"use client";

import React from "react";
import { Badge, Button, Space, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

import {
  ConfiguredColumn,
  generateColumns,
} from "@/common/components/Tables/columnUtils";
import MasterTable from "@/common/components/Tables/MasterTable";
import { formatDateTimestamp } from "@/utils/clientUtils";

const { Text } = Typography;

interface AdminUsersTableProps {
  dataList: Array<Record<string, unknown>>;
  loading: boolean;
  totalRows: number;
  onStateChange: (state: Record<string, unknown>) => void;
  roles: Array<{ roleId: number; roleName: string }>;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (record: { id?: string }) => void;
}

const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  dataList,
  loading,
  totalRows,
  onStateChange,
  roles,
  onEdit,
  onDelete,
}) => {
  const t = useTranslations("permissions");
  const buttonTexts = useTranslations("buttons");

  const renderActions = (record: Record<string, unknown>) => (
    <Space size={0}>
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
        {buttonTexts("edit")}
      </Button>
      <Button
        type="link"
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onDelete(record as { id?: string })}
      >
        {buttonTexts("delete")}
      </Button>
    </Space>
  );

  const columnConfig: ConfiguredColumn = [
    { key: "fullName", title: "Full name", visible: true },
    { key: "username", title: "Username", visible: true },
    { key: "email", title: "Email", visible: true },
    { key: "phoneNumber", title: "Phone", visible: true },
    {
      key: "roleId",
      title: "Role",
      visible: true,
      render: (text: number) => {
        const role = roles.find((r) => r.roleId === text);
        return role ? <Tag color="magenta">{role.roleName}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      key: "isOnline",
      title: "Online",
      visible: true,
      render: (_text: unknown, record: Record<string, unknown>) => {
        const online = Boolean(record?.isOnline);
        return (
          <Tooltip title={online ? "Currently online" : "Offline"}>
            <Badge status={online ? "success" : "default"} text={online ? "Online" : "Offline"} />
          </Tooltip>
        );
      },
    },
    {
      key: "lastLogin",
      title: "Last login",
      visible: true,
      render: (text: string | Date | null | undefined) => {
        if (!text) return <Text type="secondary">Never</Text>;
        return <Text>{formatDateTimestamp(text as any)}</Text>;
      },
    },
    {
      key: "isActive",
      title: "Status",
      visible: true,
      render: (text: boolean) => (
        <Badge
          status={text ? "success" : "error"}
          text={text ? "Active" : "Inactive"}
        />
      ),
    },
    { title: t("action"), visible: true, isAction: true },
  ];

  const columns = generateColumns(columnConfig, renderActions);

  return (
    <>
      <MasterTable
        title=""
        dataSource={dataList.map((item, index) => ({
          ...item,
          key: (item as { id?: string }).id ?? `item-${index}`,
        }))}
        onStateChange={onStateChange}
        totalCount={totalRows}
        loading={loading}
        columns={columns}
        renderActions={renderActions}
      />

      {dataList.length === 0 && !loading ? (
        <div style={{ textAlign: "center", paddingTop: 16 }}>
          <Text type="secondary">
            No administrators match the current filters.
          </Text>
        </div>
      ) : null}
    </>
  );
};

export default AdminUsersTable;
