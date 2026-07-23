"use client";

import React from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CoverageEligibilityRow, EligibilityStatus } from "../types";
import { ELIGIBILITY_COLOR } from "../constant";
import { formatEligibility } from "../utils";

type Props = {
  rows: CoverageEligibilityRow[];
  loading?: boolean;
};

const CoverageEligibilityTable: React.FC<Props> = ({ rows, loading }) => {
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
      width: 80,
      align: "right",
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
      />
    </Card>
  );
};

export default CoverageEligibilityTable;
