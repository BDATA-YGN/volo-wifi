"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Table, Tag, Typography } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { STATUS_COLOR } from "@/features/wifi/commerce/partners/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import type { PartnerRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PartnerRow[];
  currency: string;
  orgId?: string;
  loading?: boolean;
  onSelectPartner?: (resellerId: string) => void;
  selectedResellerId?: string | null;
};

const PartnersTable: React.FC<Props> = ({
  rows,
  currency,
  orgId,
  loading,
  onSelectPartner,
  selectedResellerId,
}) => {
  const columns: ColumnsType<PartnerRow> = [
    {
      title: "Partner",
      key: "partner",
      fixed: "left",
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
            <Tag color={STATUS_COLOR[row.status as keyof typeof STATUS_COLOR] ?? "default"}>
              {formatStatusLabel(row.status as "ACTIVE" | "SUSPENDED" | "DISABLED")}
            </Tag>
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Sites",
      dataIndex: "stationCount",
      key: "stationCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.stationCount - b.stationCount,
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, currency),
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: "descend",
    },
    {
      title: "Commission",
      key: "commission",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.commission, currency),
      sorter: (a, b) => a.commission - b.commission,
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
    },
    {
      title: "Data",
      key: "totalBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
      sorter: (a, b) => a.totalBytes - b.totalBytes,
    },
    {
      title: "",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, row) =>
        orgId ? (
          <Link
            href={`/wifi/commerce/partners/insights?orgId=${orgId}&resellerId=${row.resellerId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button type="link" size="small" icon={<LineChartOutlined />}>
              Insights
            </Button>
          </Link>
        ) : null,
    },
  ];

  return (
    <Card size="small" title="Partner ranking" styles={{ body: { padding: 0 } }}>
      <Table<PartnerRow>
        rowKey="resellerId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: 10,
          showSizeChanger: rows.length > 10,
          showTotal: (total) => `${total} partner${total === 1 ? "" : "s"}`,
        }}
        scroll={{ x: 900 }}
        onRow={(row) => ({
          onClick: onSelectPartner ? () => onSelectPartner(row.resellerId) : undefined,
          style: {
            cursor: onSelectPartner ? "pointer" : undefined,
            background:
              selectedResellerId === row.resellerId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default PartnersTable;
