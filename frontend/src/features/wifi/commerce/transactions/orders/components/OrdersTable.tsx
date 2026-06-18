"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OrderRecord } from "../types";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: OrderRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: OrderRecord) => void;
};

const OrdersTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}) => {
  const columns: ColumnsType<OrderRecord> = [
    {
      title: "Order",
      key: "order",
      render: (_, row) => (
        <div>
          <Text code style={{ fontSize: 12 }}>
            {row.orderNo}
          </Text>
          {row.note ? (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {row.note}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Partner",
      key: "reseller",
      width: 140,
      ellipsis: true,
      render: (_, row) =>
        row.reseller ? (
          <Text ellipsis={{ tooltip: row.reseller.name }}>{row.reseller.name}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Site",
      key: "station",
      width: 100,
      render: (_, row) =>
        row.station ? (
          <Tag style={{ fontFamily: "monospace" }}>{row.station.code}</Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Items",
      dataIndex: "itemCount",
      width: 72,
      align: "center",
    },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.total, row.currency),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: OrderRecord["status"]) => (
        <Tag color={STATUS_COLOR[status]}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "Sold",
      key: "soldAt",
      width: 180,
      render: (_, row) =>
        row.soldAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatWifiDateTime(row.soldAt)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<OrderRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: <Empty description="No sales orders yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "order"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default OrdersTable;
