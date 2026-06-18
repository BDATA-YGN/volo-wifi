"use client";

import React from "react";
import { Button, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { ActivityLogRecord } from "../types";
import { ACTION_COLOR, DEFAULT_ACTION_COLOR } from "../constant";
import { formatActionLabel, formatEntityLabel, summarizeMeta } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: ActivityLogRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: ActivityLogRecord) => void;
};

const ActivityLogTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}) => {
  const columns: ColumnsType<ActivityLogRecord> = [
    {
      title: "Time",
      dataIndex: "createdAt",
      width: 130,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(v).format("MMM D, HH:mm:ss")}
        </Text>
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      width: 160,
      render: (action: string) => (
        <Tag color={ACTION_COLOR[action] ?? DEFAULT_ACTION_COLOR}>{formatActionLabel(action)}</Tag>
      ),
    },
    {
      title: "Actor",
      key: "actor",
      width: 160,
      ellipsis: true,
      render: (_, row) =>
        row.admin ? (
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {row.admin.fullName}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                @{row.admin.username}
              </Text>
            </div>
          </div>
        ) : (
          <Text type="secondary">System</Text>
        ),
    },
    {
      title: "Entity",
      key: "entity",
      width: 120,
      render: (_, row) =>
        row.entity ? (
          <Text style={{ fontSize: 12 }}>{formatEntityLabel(row.entity)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Summary",
      key: "summary",
      ellipsis: true,
      render: (_, row) => {
        const summary = summarizeMeta(row.meta);
        if (summary) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {summary}
            </Text>
          );
        }
        if (row.entityId) {
          return (
            <Text code style={{ fontSize: 11 }}>
              {row.entityId.slice(0, 8)}…
            </Text>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: "IP",
      dataIndex: "ip",
      width: 120,
      render: (ip: string | null) =>
        ip ? (
          <Text code style={{ fontSize: 11 }}>
            {ip}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 72,
      align: "right",
      fixed: "right",
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Table<ActivityLogRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 960 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No activity matches the current filters"
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        showTotal: (t) => `${t} entr${t === 1 ? 'y' : 'ies'}`
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default ActivityLogTable;
