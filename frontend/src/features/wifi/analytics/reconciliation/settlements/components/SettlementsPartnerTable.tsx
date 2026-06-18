"use client";

import React from "react";
import Link from "next/link";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SettlementPartnerRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SettlementPartnerRow[];
  currency: string;
  loading?: boolean;
  selectedResellerId?: string;
  onSelectPartner?: (resellerId: string) => void;
};

const SettlementsPartnerTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  selectedResellerId,
  onSelectPartner,
}) => {
  const columns: ColumnsType<SettlementPartnerRow> = [
    {
      title: "Partner",
      key: "partner",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Runs",
      dataIndex: "settlementCount",
      key: "settlementCount",
      width: 70,
      align: "right",
    },
    {
      title: "System",
      key: "systemTotal",
      width: 100,
      align: "right",
      render: (_, row) => formatMoney(row.systemTotal, currency),
      sorter: (a, b) => a.systemTotal - b.systemTotal,
      defaultSortOrder: "descend",
    },
    {
      title: "Variance",
      key: "varianceTotal",
      width: 100,
      align: "right",
      render: (_, row) => (
        <Text type={row.varianceTotal !== 0 ? "warning" : "secondary"}>
          {formatMoney(row.varianceTotal, currency)}
        </Text>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="By partner"
      extra={
        <Link href="/wifi/commerce/partners">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Partners →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<SettlementPartnerRow>
        size="small"
        rowKey="resellerId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 6, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) =>
          row.resellerId === selectedResellerId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => onSelectPartner?.(row.resellerId),
          style: { cursor: onSelectPartner ? "pointer" : undefined },
        })}
        scroll={{ x: 400 }}
      />
    </Card>
  );
};

export default SettlementsPartnerTable;
