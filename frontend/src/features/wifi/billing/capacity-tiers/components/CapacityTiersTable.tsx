"use client";

import React from "react";
import Link from "next/link";
import { Button, Dropdown, Table, Tag, Tooltip, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, LinkOutlined, MoreOutlined } from "@ant-design/icons";
import type { CapacityTierRecord } from "../types";
import { resolveTierColor, TOKEN_USAGE_SCOPE_LABEL } from "../constant";

const { Text } = Typography;

type Props = {
  data: CapacityTierRecord[];
  loading?: boolean;
  onEdit: (record: CapacityTierRecord) => void;
  onDelete: (record: CapacityTierRecord) => void;
  onToggleActive: (record: CapacityTierRecord, active: boolean) => void;
};

const CapacityTiersTable: React.FC<Props> = ({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const { token } = theme.useToken();

  const columns: ColumnsType<CapacityTierRecord> = [
    {
      title: "Order",
      dataIndex: "sortOrder",
      width: 72,
      align: "center",
      sorter: (a, b) => a.sortOrder - b.sortOrder,
      defaultSortOrder: "ascend",
      render: (value: number) => (
        <Text type="secondary" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Text>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      width: 120,
      render: (code: string, record) => (
        <Tag
          color={resolveTierColor(code, record.name)}
          style={{ margin: 0, fontFamily: "monospace" }}
        >
          {code}
        </Tag>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.description ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Token usage",
      dataIndex: "tokenUsageScope",
      width: 120,
      render: (scope: string | undefined) => (
        <Text style={{ fontSize: 13 }}>{TOKEN_USAGE_SCOPE_LABEL[scope ?? "ALL"] ?? scope ?? "All sites"}</Text>
      ),
    },
    {
      title: "Licensed sites",
      key: "stations",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Text style={{ fontVariantNumeric: "tabular-nums" }}>{record._count?.stations ?? 0}</Text>
      ),
    },
    {
      title: "Platform rates",
      key: "rates",
      width: 130,
      align: "center",
      render: (_, record) => {
        const count = record._count?.globalLicensePrices ?? 0;
        return count > 0 ? (
          <Tag color="success">{count} active</Tag>
        ) : (
          <Tooltip title="Configure monthly rate on Platform Tier Rates">
            <Link href="/wifi/billing/tier-rates/platform">
              <Tag color="warning" icon={<LinkOutlined />} style={{ cursor: "pointer" }}>
                Not set
              </Tag>
            </Link>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (active: boolean) =>
        active ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 56,
      fixed: "right",
      render: (_, record) => {
        const inUse =
          (record._count?.stations ?? 0) > 0 ||
          (record._count?.globalLicensePrices ?? 0) > 0 ||
          (record._count?.orgLicensePrices ?? 0) > 0;

        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "Edit",
                  onClick: () => onEdit(record),
                },
                {
                  key: "toggle",
                  label: record.isActive ? "Deactivate" : "Activate",
                  onClick: () => onToggleActive(record, !record.isActive),
                },
                { type: "divider" },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "Delete",
                  danger: true,
                  disabled: inUse,
                  onClick: () => onDelete(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Actions" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Table<CapacityTierRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: 800 }}
      locale={{
        emptyText: (
          <div style={{ padding: "32px 0" }}>
            <Text type="secondary">No capacity tiers yet. Add SMALL, MEDIUM, and LARGE to get started.</Text>
          </div>
        ),
      }}
      style={{ borderRadius: token.borderRadiusLG }}
    />
  );
};

export default CapacityTiersTable;
