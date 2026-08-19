"use client";

import React, { useMemo } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import type { RevenueTierRow } from "../types";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";
import { formatCount, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: RevenueTierRow[];
  currency: string;
  loading?: boolean;
  onSelectTier?: (stationSizeId: string) => void;
};

const RevenueTierTable: React.FC<Props> = ({ rows, currency, loading, onSelectTier }) => {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          siteCount: acc.siteCount + row.siteCount,
          ordersCount: acc.ordersCount + row.ordersCount,
          itemsCount: acc.itemsCount + row.itemsCount,
          revenue: acc.revenue + row.revenue,
          commission: acc.commission + row.commission,
          netRevenue: acc.netRevenue + row.netRevenue,
        }),
        {
          siteCount: 0,
          ordersCount: 0,
          itemsCount: 0,
          revenue: 0,
          commission: 0,
          netRevenue: 0,
        }
      ),
    [rows]
  );

  const columns: ColumnsType<RevenueTierRow> = [
    {
      title: "Tier",
      key: "name",
      fixed: "left",
      width: 200,
      sorter: (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      render: (_, row) => (
        <div>
          <Tag color={resolveTierColor(row.code, row.name)}>{row.code}</Tag>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {row.name}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Sites",
      dataIndex: "siteCount",
      key: "siteCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.siteCount - b.siteCount,
      render: (n: number) => formatCount(n),
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
      render: (n: number) => formatCount(n),
    },
    {
      title: "Tokens",
      dataIndex: "itemsCount",
      key: "itemsCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.itemsCount - b.itemsCount,
      render: (n: number) => formatCount(n),
    },
    {
      title: "Gross",
      dataIndex: "revenue",
      key: "revenue",
      width: 140,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (n: number) => <Text strong>{formatMoney(n, currency)}</Text>,
    },
    {
      title: "Commission",
      dataIndex: "commission",
      key: "commission",
      width: 130,
      align: "right",
      sorter: (a, b) => a.commission - b.commission,
      render: (n: number) => formatMoney(n, currency),
    },
    {
      title: "Net",
      dataIndex: "netRevenue",
      key: "netRevenue",
      width: 140,
      align: "right",
      sorter: (a, b) => a.netRevenue - b.netRevenue,
      render: (n: number) => <Text strong>{formatMoney(n, currency)}</Text>,
    },
  ];

  return (
    <Card
      size="small"
      title="By tier"
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatCount(rows.length)} tiers · click to open sites
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<RevenueTierRow>
        size="small"
        rowKey="stationSizeId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 900 }}
        onRow={(row) => ({
          onClick: () => onSelectTier?.(row.stationSizeId),
          style: { cursor: onSelectTier ? "pointer" : undefined },
        })}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>{formatCount(totals.siteCount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong>{formatCount(totals.ordersCount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text strong>{formatCount(totals.itemsCount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong>{formatMoney(totals.revenue, currency)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text strong>{formatMoney(totals.commission, currency)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <Text strong>{formatMoney(totals.netRevenue, currency)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default RevenueTierTable;
