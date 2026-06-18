"use client";

import React from "react";
import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ChangelogEntry } from "../types";
import { CHANGE_TYPE_COLOR, TIER_CODE_COLORS } from "../constant";
import { formatDateTime } from "../../../tier-rates/platform/utils";
import { describeChangelogEntry, formatChangeType } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  entries: ChangelogEntry[];
  loading?: boolean;
  currency?: string;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
};

const ChangelogTable: React.FC<Props> = ({
  entries,
  loading,
  currency = "MMK",
  page,
  pageSize,
  total,
  onPaginationChange,
}) => {
  const columns: ColumnsType<ChangelogEntry> = [
    {
      title: "When",
      dataIndex: "createdAt",
      width: 170,
      render: (v: string) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    {
      title: "Type",
      dataIndex: "changeType",
      width: 150,
      render: (type: string) => (
        <Tag color={CHANGE_TYPE_COLOR[type] ?? "default"}>{formatChangeType(type)}</Tag>
      ),
    },
    {
      title: "Change",
      key: "summary",
      render: (_, row) => (
        <div>
          <Text>{describeChangelogEntry(row, currency)}</Text>
          {row.stationSize ? (
            <div className="mt-1">
              <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}>
                {row.stationSize.code}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.stationSize.name}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      ellipsis: true,
      render: (reason: string | null) =>
        reason ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {reason}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Changed by",
      key: "admin",
      width: 140,
      render: (_, row) => (
        <Text style={{ fontSize: 12 }}>
          {row.changedByAdmin.fullName || row.changedByAdmin.username}
        </Text>
      ),
    },
  ];

  if (!loading && entries.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No changelog entries match the current filters."
      />
    );
  }

  return (
    <Table<ChangelogEntry>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={entries}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        showTotal: (t) => `${t} entries`
      })}
    />
  );
};

export default ChangelogTable;
