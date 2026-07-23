"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PriceBookRecord } from "../types";
import { SCOPE_COLOR } from "../constant";
import { formatBookScopeTarget, formatBookScopeTargetShort, formatScopeLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PriceBookRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onManagePrices: (record: PriceBookRecord) => void;
  onEdit: (record: PriceBookRecord) => void;
  onDelete: (record: PriceBookRecord) => void;
};

const PriceBooksTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onManagePrices,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<PriceBookRecord> = [
    {
      title: "Price book",
      key: "book",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          {row.isDefault ? (
            <Tag color="gold" className="ml-2">
              Default
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: "Scope",
      dataIndex: "scope",
      width: 140,
      render: (scope: PriceBookRecord["scope"]) => (
        <Tag color={SCOPE_COLOR[scope]}>{formatScopeLabel(scope)}</Tag>
      ),
    },
    {
      title: "Applies to",
      key: "target",
      ellipsis: true,
      render: (_, row) => {
        const full = formatBookScopeTarget(row);
        const short = formatBookScopeTargetShort(row);
        const needsTip = full !== short;
        const label = (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {short}
          </Text>
        );
        return needsTip ? <Tooltip title={full}>{label}</Tooltip> : label;
      },
    },
    {
      title: "Plan prices",
      key: "prices",
      width: 100,
      align: "center",
      render: (_, row) => (
        <Text style={{ fontVariantNumeric: "tabular-nums" }}>{row._count?.prices ?? 0}</Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 240,
      align: "right",
      fixed: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onManagePrices(row)}>
            Prices
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
    <Table<PriceBookRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 900 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No price books yet — create a default book to set tenant-wide retail prices."
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "book"
      })}
      onRow={(record) => ({
        onClick: () => onManagePrices(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PriceBooksTable;
