"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RadiusProfileRecord } from "../types";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: RadiusProfileRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit: (record: RadiusProfileRecord) => void;
  onDelete: (record: RadiusProfileRecord) => void;
};

const RadiusProfilesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<RadiusProfileRecord> = [
    {
      title: "Server",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            {row.isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>}
            {row.hasSharedSecret ? (
              <Tag color="blue">Default secret</Tag>
            ) : (
              <Tag>Per-device secrets</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Host",
      dataIndex: "serverHost",
      width: 160,
      render: (v: string | null) =>
        v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "NAS type",
      dataIndex: "nasType",
      width: 110,
      render: (v: string) => <Text type="secondary">{v || "other"}</Text>,
    },
    {
      title: "Seeded from",
      key: "source",
      render: (_, row) =>
        row.sourceStation ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.sourceStation.code}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Devices",
      key: "devices",
      width: 90,
      align: "right",
      render: (_, row) =>
        row._count.devices > 0 ? (
          <Tag color="blue">{row._count.devices}</Tag>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(row)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={data}
      columns={columns}
      locale={{ emptyText: <Empty description="No FreeRADIUS servers yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        noun: "server",
      })}
    />
  );
};

export default RadiusProfilesTable;
