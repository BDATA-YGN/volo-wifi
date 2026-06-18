"use client";

import React from "react";
import { Button, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { AuthEventRecord } from "../types";
import { OUTCOME_COLOR } from "../constant";
import { formatMac, formatOutcomeLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: AuthEventRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: AuthEventRecord) => void;
};

const AuthEventsTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}) => {
  const columns: ColumnsType<AuthEventRecord> = [
    {
      title: "Time",
      dataIndex: "authdate",
      width: 130,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(v).format("MMM D, HH:mm:ss")}
        </Text>
      ),
    },
    {
      title: "Outcome",
      dataIndex: "outcome",
      width: 100,
      render: (outcome: AuthEventRecord["outcome"]) => (
        <Tag color={OUTCOME_COLOR[outcome]}>{formatOutcomeLabel(outcome)}</Tag>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      ellipsis: true,
      render: (username: string) => <Text strong>{username}</Text>,
    },
    {
      title: "Client MAC",
      dataIndex: "callingStationId",
      width: 140,
      render: (mac: string | null) => (
        <Text code style={{ fontSize: 11 }}>
          {formatMac(mac)}
        </Text>
      ),
    },
    {
      title: "AP / NAS MAC",
      dataIndex: "calledStationId",
      width: 140,
      render: (mac: string | null) => (
        <Text code style={{ fontSize: 11 }}>
          {formatMac(mac)}
        </Text>
      ),
    },
    {
      title: "Reply",
      dataIndex: "reply",
      ellipsis: true,
      render: (reply: string | null) =>
        reply ? (
          <Text style={{ fontSize: 12 }}>{reply}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Class",
      dataIndex: "class",
      width: 120,
      ellipsis: true,
      render: (classVal: string | null) =>
        classVal ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {classVal}
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
    <Table<AuthEventRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1000 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No auth events match the current filters"
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "event"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default AuthEventsTable;
