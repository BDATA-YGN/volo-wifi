"use client";

import React from "react";
import { Button, Card, Table, Tag, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { CoverageScopeRow, EligibilityStatus } from "../types";
import { ELIGIBILITY_COLOR } from "../constant";
import { formatCount, formatEligibility, formatGapDays } from "../utils";

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
      filters: [
        { text: "Coverage gap", value: "GAP" },
        { text: "No coverage record", value: "NO_COVERAGE" },
        { text: "Unsealed posting", value: "UNSEALED" },
        { text: "Fully sealed", value: "SEALED" },
      ],
      onFilter: (value, row) => row.eligibility === value,
      render: (status: EligibilityStatus) => (
        <Tag color={ELIGIBILITY_COLOR[status]}>{formatEligibility(status)}</Tag>
      ),
    },
    {
      title: "Partner / Site",
      key: "context",
      sorter: (a, b) =>
        a.resellerName.localeCompare(b.resellerName) || a.stationName.localeCompare(b.stationName),
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.resellerName}
          </Text>
          <div>
            <WifiMutedText style={{ fontSize: 12 }}>
              {row.stationName}{" "}
              <Text code style={{ fontSize: 10 }}>
                {row.stationCode}
              </Text>
            </WifiMutedText>
          </div>
        </div>
      ),
    },
    {
      title: "Max covered",
      dataIndex: "maxCoveredPaidAt",
      key: "maxCoveredPaidAt",
      width: 150,
      sorter: (a, b) =>
        (a.maxCoveredPaidAt ?? "").localeCompare(b.maxCoveredPaidAt ?? ""),
      render: (value: string | null) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—",
    },
    {
      title: "Latest payment",
      dataIndex: "latestPaymentAt",
      key: "latestPaymentAt",
      width: 150,
      sorter: (a, b) =>
        (a.latestPaymentAt ?? "").localeCompare(b.latestPaymentAt ?? ""),
      render: (value: string | null) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "—",
    },
    {
      title: "Gap",
      dataIndex: "gapDays",
      key: "gapDays",
      width: 90,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.gapDays - b.gapDays,
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
      width: 110,
      align: "right",
      sorter: (a, b) => a.uncoveredPaymentCount - b.uncoveredPaymentCount,
      render: (count: number) => (
        <Text type={count > 0 ? "warning" : "secondary"}>{formatCount(count)}</Text>
      ),
    },
    {
      title: "Payments",
      dataIndex: "paymentCount",
      key: "paymentCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.paymentCount - b.paymentCount,
      render: (n: number) => formatCount(n),
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
            onClick={(event) => {
              event.stopPropagation();
              onView(row);
            }}
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
        <WifiMutedText style={{ fontSize: 12 }}>
          {formatCount(rows.length)} partner × site scopes
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<CoverageScopeRow>
        size="small"
        rowKey={(row) => row.coverageId ?? `${row.resellerId}:${row.stationId}`}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 1180, y: "calc(var(--content-body-height) - 280px)" }}
        locale={{ emptyText: "No coverage scopes match the selected filters" }}
        onRow={(row) => ({
          onClick: () => {
            if (row.coverageId) onView(row);
          },
          style: { cursor: row.coverageId ? "pointer" : undefined },
        })}
      />
    </Card>
  );
};

export default CoverageScopesTable;
