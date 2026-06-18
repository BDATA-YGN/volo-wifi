"use client";

import React from "react";
import { Button, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { LiveSessionRecord } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";
import {
  formatBytes,
  formatMac,
  formatSessionDuration,
  sessionDisplayName,
} from "../utils";

const { Text } = Typography;

type Props = {
  data: LiveSessionRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: LiveSessionRecord) => void;
};

const LiveSessionsTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}) => {
  const columns: ColumnsType<LiveSessionRecord> = [
    {
      title: "Subscriber",
      key: "user",
      render: (_, row) => (
        <div>
          <Text strong>{sessionDisplayName(row)}</Text>
          {row.callingStationId ? (
            <div>
              <Text type="secondary" code style={{ fontSize: 11 }}>
                {formatMac(row.callingStationId)}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Client IP",
      dataIndex: "framedIpAddress",
      width: 120,
      render: (ip: string | null) =>
        ip ? (
          <Text code style={{ fontSize: 12 }}>
            {ip}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Site / Tenant",
      key: "site",
      width: 160,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 12 }}>{row.station?.name ?? "—"}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.org?.code ?? "—"}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "NAS",
      key: "nas",
      width: 130,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Text code style={{ fontSize: 11 }}>
            {row.nasIpAddress ?? "—"}
          </Text>
          {row.nasIdentifier ? (
            <div>
              <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 120 }}>
                {row.nasIdentifier}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (status: LiveSessionRecord["status"]) => (
        <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      width: 90,
      render: (_, row) => (
        <Text style={{ fontSize: 12 }}>
          {formatSessionDuration(
            row.sessionTimeSec,
            row.startedAt,
            row.stoppedAt,
            row.status
          )}
        </Text>
      ),
    },
    {
      title: "Data",
      key: "data",
      width: 100,
      align: "right",
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 12 }}>{formatBytes(row.totalBytes)}</Text>
          {row.inputBytes || row.outputBytes ? (
            <div>
              <Text type="secondary" style={{ fontSize: 10 }}>
                ↓{formatBytes(row.inputBytes)} ↑{formatBytes(row.outputBytes)}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Started",
      dataIndex: "startedAt",
      width: 110,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(v).format("MMM D, HH:mm")}
        </Text>
      ),
    },
    {
      title: "Last update",
      key: "lastUpdate",
      width: 110,
      render: (_, row) => {
        const ts = row.lastInterimAt ?? row.stoppedAt ?? row.startedAt;
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(ts).format("MMM D, HH:mm")}
          </Text>
        );
      },
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
    <Table<LiveSessionRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1100 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No sessions match the current filters"
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "session"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default LiveSessionsTable;
