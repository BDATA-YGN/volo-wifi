"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CoveragePartnerRow } from "../types";
import { formatGapDays } from "../utils";

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
      width: 70,
      align: "right",
    },
    {
      title: "Gaps",
      dataIndex: "gapCount",
      key: "gapCount",
      width: 60,
      align: "right",
      render: (count: number) => (
        <Text type={count > 0 ? "warning" : "secondary"}>{count}</Text>
      ),
    },
    {
      title: "Sealed",
      dataIndex: "sealedCount",
      key: "sealedCount",
      width: 60,
      align: "right",
    },
    {
      title: "Avg gap",
      key: "avgGapDays",
      width: 80,
      align: "right",
      render: (_, row) => formatGapDays(row.avgGapDays),
    },
  ];

  return (
    <Card size="small" title="By partner" styles={{ body: { padding: 0 } }}>
      <Table<CoveragePartnerRow>
        size="small"
        rowKey="resellerId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        onRow={(row) => ({
          onClick: () => onSelectPartner(row.resellerId),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default CoveragePartnerTable;
