"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CatalogAttributeRecord } from "../types";
import { VALUE_TYPE_COLOR } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: CatalogAttributeRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit: (record: CatalogAttributeRecord) => void;
  onDelete: (record: CatalogAttributeRecord) => void;
};

const AttributeCatalogTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<CatalogAttributeRecord> = [
    {
      title: "FreeRADIUS name",
      dataIndex: "freeradiusName",
      render: (name: string) => (
        <Text code strong style={{ fontSize: 12 }}>
          {name}
        </Text>
      ),
    },
    {
      title: "Display name",
      dataIndex: "displayName",
    },
    {
      title: "Op",
      dataIndex: "op",
      width: 70,
      render: (op: string) => <Text code>{op}</Text>,
    },
    {
      title: "Type",
      dataIndex: "valueType",
      width: 100,
      render: (type: string) => <Tag color={VALUE_TYPE_COLOR[type] ?? "default"}>{type}</Tag>,
    },
    {
      title: "Default",
      dataIndex: "defaultValue",
      width: 120,
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Text type="secondary">{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Profiles",
      key: "profiles",
      width: 90,
      align: "right",
      render: (_, row) =>
        row._count.vendorProfileLinks > 0 ? (
          <Tag color="blue">{row._count.vendorProfileLinks}</Tag>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      align: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={row._count.vendorProfileLinks > 0}
            onClick={() => onDelete(row)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  if (!loading && data.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No RADIUS attributes in the catalog. Add standard FreeRADIUS reply attributes used by your NAS vendors."
      />
    );
  }

  return (
    <Table<CatalogAttributeRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "attribute"
      })}
      onRow={(record) => ({
        onClick: () => onEdit(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default AttributeCatalogTable;
