"use client";

import React, { useMemo } from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CoverageEligibilityRow, EligibilityStatus } from "../types";
import { ELIGIBILITY_COLOR } from "../constant";
import { formatCount, formatEligibility, formatPercent } from "../utils";

type Props = {
  rows: CoverageEligibilityRow[];
  loading?: boolean;
  selectedEligibility?: EligibilityStatus;
  onSelectEligibility?: (status: EligibilityStatus) => void;
};

const CoverageEligibilityTable: React.FC<Props> = ({
  rows,
  loading,
  selectedEligibility,
  onSelectEligibility,
}) => {
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.count, 0), [rows]);

  const columns: ColumnsType<CoverageEligibilityRow> = [
    {
      title: "Eligibility",
      dataIndex: "status",
      key: "status",
      render: (status: EligibilityStatus) => (
        <Tag color={ELIGIBILITY_COLOR[status]}>{formatEligibility(status)}</Tag>
      ),
    },
    {
      title: "Scopes",
      dataIndex: "count",
      key: "count",
      width: 90,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      render: (count: number) => formatCount(count),
    },
    {
      title: "Share",
      key: "share",
      width: 80,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      render: (_, row) => formatPercent(total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0),
    },
  ];

  return (
    <Card size="small" title="By eligibility" styles={{ body: { padding: 0 } }}>
      <Table<CoverageEligibilityRow>
        size="small"
        rowKey="status"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        onRow={(row) => ({
          onClick: () => onSelectEligibility?.(row.status),
          style: {
            cursor: onSelectEligibility ? "pointer" : undefined,
            fontWeight: row.status === selectedEligibility ? 600 : undefined,
          },
        })}
      />
    </Card>
  );
};

export default CoverageEligibilityTable;
