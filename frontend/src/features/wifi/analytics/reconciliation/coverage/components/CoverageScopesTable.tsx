"use client";

import React from "react";
import { Button, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { CoverageScopeRow, EligibilityStatus } from "../types";
import { ELIGIBILITY_COLOR } from "../constant";
import { formatEligibility, formatGapDays } from "../utils";

const { Text } = Typography;

type Props = {
  rows: CoverageScopeRow[];
  loading?: boolean;
  onView: (row: CoverageScopeRow) => void;
};

const CoverageScopesTable: React.FC<Props> = ({ rows, loading, onView }) => {
  const columns: ColumnsType<CoverageScopeRow> = [
    {
      title: "Eligibility",
      dataIndex: "eligibility",
      key: "eligibility",
      width: 150,
      render: (status: EligibilityStatus) => (
        <Tag color={ELIGIBILITY_COLOR[status]}>{formatEligibility(status)}</Tag>
      ),
    },
    {
      title: "Partner / Site",
      key: "context",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.resellerName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.stationName}{" "}
              <Text code style={{ fontSize: 10 }}>
                {row.stationCode}
              </Text>
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Max covered",
      dataIndex: "maxCoveredPaidAt",
      key: "maxCoveredPaidAt",
      width: 140,
      render: (value: string | null) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—",
    },
    {
      title: "Latest payment",
      dataIndex: "latestPaymentAt",
      key: "latestPaymentAt",
      width: 140,
      render: (value: string | null) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—",
    },
    {
      title: "Gap",
      dataIndex: "gapDays",
      key: "gapDays",
      width: 80,
      align: "right",
      render: (days: number, row) => (
        <Text type={row.eligibility === "GAP" ? "warning" : "secondary"}>
          {formatGapDays(days)}
        </Text>
      ),
    },
    {
      title: "Uncovered",
      dataIndex: "uncoveredPaymentCount",
      key: "uncoveredPaymentCount",
      width: 90,
      align: "right",
      render: (count: number) => (
        <Text type={count > 0 ? "warning" : "secondary"}>{count}</Text>
      ),
    },
    {
      title: "Posting",
      key: "posting",
      width: 90,
      render: (_, row) =>
        row.lastPostingId ? (
          <Tag color={row.postingSealed ? "purple" : "default"}>
            {row.postingSealed ? "Sealed" : "Open"}
          </Tag>
        ) : (
          <Tag>None</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, row) =>
        row.coverageId ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(row)}
          >
            View
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      size="small"
      title="Coverage ledger"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          Partner × site sealed payment horizon
        </Text>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<CoverageScopeRow>
        size="small"
        rowKey={(row) => row.coverageId ?? `${row.resellerId}:${row.stationId}`}
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
        locale={{ emptyText: "No coverage scopes match the selected filters" }}
      />
    </Card>
  );
};

export default CoverageScopesTable;
