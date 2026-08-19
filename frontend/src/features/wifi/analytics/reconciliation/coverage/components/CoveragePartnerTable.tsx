"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import type { CoveragePartnerRow } from "../types";
import { formatCount, formatGapDays, formatPercent, sealedPct } from "../utils";

const { Text } = Typography;

type Props = {
  rows: CoveragePartnerRow[];
  loading?: boolean;
  selectedResellerId?: string;
  onSelectPartner: (resellerId: string) => void;
};

const CoveragePartnerTable: React.FC<Props> = ({
  rows,
  loading,
  selectedResellerId,
  onSelectPartner,
}) => {
  const columns: ColumnsType<CoveragePartnerRow> = [
    {
      title: "Partner",
      key: "name",
      fixed: "left",
      width: 220,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, row) => (
        <div>
          <Text strong={row.resellerId === selectedResellerId} style={{ fontSize: 13 }}>
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
      title: "Scopes",
      dataIndex: "scopeCount",
      key: "scopeCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.scopeCount - b.scopeCount,
      render: (n: number) => formatCount(n),
    },
    {
      title: "Sealed",
      dataIndex: "sealedCount",
      key: "sealedCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sealedCount - b.sealedCount,
      render: (n: number) => formatCount(n),
    },
    {
      title: "Sealed %",
      key: "sealedPct",
      width: 100,
      align: "right",
      sorter: (a, b) =>
        (a.sealedPct ?? sealedPct(a.sealedCount, a.scopeCount)) -
        (b.sealedPct ?? sealedPct(b.sealedCount, b.scopeCount)),
      render: (_, row) =>
        formatPercent(row.sealedPct ?? sealedPct(row.sealedCount, row.scopeCount)),
    },
    {
      title: "Gaps",
      dataIndex: "gapCount",
      key: "gapCount",
      width: 80,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.gapCount - b.gapCount,
      render: (count: number) => (
        <Text type={count > 0 ? "warning" : "secondary"}>{formatCount(count)}</Text>
      ),
    },
    {
      title: "Unsealed",
      dataIndex: "unsealedCount",
      key: "unsealedCount",
      width: 100,
      align: "right",
      sorter: (a, b) => (a.unsealedCount ?? 0) - (b.unsealedCount ?? 0),
      render: (n: number | undefined) => formatCount(n ?? 0),
    },
    {
      title: "Uncovered",
      dataIndex: "uncoveredPaymentCount",
      key: "uncoveredPaymentCount",
      width: 110,
      align: "right",
      sorter: (a, b) => (a.uncoveredPaymentCount ?? 0) - (b.uncoveredPaymentCount ?? 0),
      render: (n: number | undefined) => {
        const count = n ?? 0;
        return <Text type={count > 0 ? "warning" : "secondary"}>{formatCount(count)}</Text>;
      },
    },
    {
      title: "Avg gap",
      key: "avgGapDays",
      width: 100,
      align: "right",
      sorter: (a, b) => a.avgGapDays - b.avgGapDays,
      render: (_, row) => formatGapDays(row.avgGapDays),
    },
  ];

  return (
    <Card
      size="small"
      title="By partner"
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatCount(rows.length)} partners · click to filter
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<CoveragePartnerRow>
        size="small"
        rowKey="resellerId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 980, y: "calc(var(--content-body-height) - 280px)" }}
        onRow={(row) => ({
          onClick: () => onSelectPartner(row.resellerId),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default CoveragePartnerTable;
