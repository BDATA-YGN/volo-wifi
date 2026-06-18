"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PartnerRecord } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatStatusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PartnerRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: PartnerRecord) => void;
  onEdit: (record: PartnerRecord) => void;
  onDelete: (record: PartnerRecord) => void;
};

function TagList({
  items,
  emptyLabel,
  max = 3,
}: {
  items: { code: string; name: string }[];
  emptyLabel: string;
  max?: number;
}) {
  if (items.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {emptyLabel}
      </Text>
    );
  }

  const visible = items.slice(0, max);
  const rest = items.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <Tooltip key={item.code} title={item.name}>
          <Tag style={{ margin: 0, fontFamily: "monospace", fontSize: 11 }}>
            {item.code}
          </Tag>
        </Tooltip>
      ))}
      {rest > 0 ? (
        <Tag style={{ margin: 0, fontSize: 11 }}>+{rest}</Tag>
      ) : null}
    </div>
  );
}

const PartnersTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<PartnerRecord> = [
    {
      title: "Partner",
      key: "partner",
      width: 220,
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Tag style={{ margin: 0, fontFamily: "monospace" }}>{row.code}</Tag>
            <Text strong>{row.name}</Text>
          </div>
          {row.email || row.phone ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[row.email, row.phone].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Login account",
      key: "login",
      width: 160,
      render: (_, row) =>
        row.portalAccount ? (
          <Text code style={{ fontSize: 12 }}>
            {row.portalAccount.username}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No login
          </Text>
        ),
    },
    {
      title: "Sites",
      key: "sites",
      width: 180,
      render: (_, row) => (
        <TagList items={row.stations ?? []} emptyLabel="No sites" max={2} />
      ),
    },
    {
      title: "Sellable plans",
      key: "plans",
      width: 200,
      render: (_, row) => (
        <TagList items={row.sellablePlans ?? []} emptyLabel="No plans" max={2} />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: PartnerRecord["status"]) => (
        <Tag color={STATUS_COLOR[status]}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "Sales",
      dataIndex: "salesCount",
      width: 64,
      align: "center",
      render: (count: number) =>
        count > 0 ? count : <Text type="secondary">—</Text>,
    },
    {
      title: "",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
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
    <Table<PartnerRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1100 }}
      locale={{ emptyText: <Empty description="No partners yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "partner"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PartnersTable;
