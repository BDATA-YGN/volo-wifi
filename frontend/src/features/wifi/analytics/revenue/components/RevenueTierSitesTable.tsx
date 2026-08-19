"use client";

import React, { useMemo } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import type { RevenueSiteRow, RevenueTierRow } from "../types";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";
import { formatCount, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  tier: RevenueTierRow;
  currency: string;
  loading?: boolean;
};

const RevenueTierSitesTable: React.FC<Props> = ({ tier, currency, loading }) => {
  const totals = useMemo(
    () => ({
      ordersCount: tier.ordersCount,
      itemsCount: tier.itemsCount,
      revenue: tier.revenue,
      commission: tier.commission,
      netRevenue: tier.netRevenue,
    }),
    [tier]
  );

  const columns: ColumnsType<RevenueSiteRow> = [
    {
      title: "Site",
      key: "name",
      fixed: "left",
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 10 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
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
      id={`revenue-tier-${tier.stationSizeId}`}
      size="small"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Tag color={resolveTierColor(tier.code, tier.name)}>{tier.code}</Tag>
          <span>{tier.name}</span>
        </span>
      }
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatCount(tier.siteCount)} sites
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<RevenueSiteRow>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={tier.sites}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 860 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>{formatCount(totals.ordersCount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong>{formatCount(totals.itemsCount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text strong>{formatMoney(totals.revenue, currency)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong>{formatMoney(totals.commission, currency)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text strong>{formatMoney(totals.netRevenue, currency)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default RevenueTierSitesTable;
