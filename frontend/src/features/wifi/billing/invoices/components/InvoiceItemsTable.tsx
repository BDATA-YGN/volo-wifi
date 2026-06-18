"use client";

import React from "react";
import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InvoiceItem } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatMoney } from "../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  items: InvoiceItem[];
  currency: string;
  loading?: boolean;
};

const InvoiceItemsTable: React.FC<Props> = ({ items, currency, loading }) => {
  const columns: ColumnsType<InvoiceItem> = [
    {
      title: "Tier",
      key: "tier",
      width: 90,
      render: (_, row) => (
        <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}>
          {row.stationSize.code}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 70,
      align: "right",
    },
    {
      title: "Unit price",
      dataIndex: "unitPrice",
      width: 120,
      align: "right",
      render: (v: string) => formatMoney(v, currency),
    },
    {
      title: "Subtotal",
      dataIndex: "lineSubtotal",
      width: 120,
      align: "right",
      render: (v: string) => <Text strong>{formatMoney(v, currency)}</Text>,
    },
    {
      title: "Line total",
      dataIndex: "lineTotal",
      width: 120,
      align: "right",
      render: (v: string) => <Text strong>{formatMoney(v, currency)}</Text>,
    },
  ];

  return (
    <Table<InvoiceItem>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={items}
      pagination={false}
      summary={(pageData) => {
        const subtotal = pageData.reduce((sum, row) => sum + Number(row.lineSubtotal), 0);
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4} align="right">
              <Text type="secondary">Items subtotal</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Text strong>{formatMoney(subtotal, currency)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        );
      }}
    />
  );
};

export default InvoiceItemsTable;
