"use client";

import React from "react";
import Link from "next/link";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SiteRecord } from "../types";
import { STATUS_COLOR, resolveTierColor } from "../constant";
import { formatStatusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: SiteRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: SiteRecord) => void;
  onEdit: (record: SiteRecord) => void;
  onDelete: (record: SiteRecord) => void;
};

const SitesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<SiteRecord> = [
    {
      title: "Site",
      key: "site",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Tag style={{ margin: 0, fontFamily: "monospace" }}>{row.code}</Tag>
            <Text strong>{row.name}</Text>
          </div>
          {row.location ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.location}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Township",
      dataIndex: "township",
      width: 140,
      ellipsis: true,
      render: (township: string | null) =>
        township ? (
          <Text type="secondary">{township}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Capacity tier",
      key: "tier",
      width: 140,
      render: (_, row) => (
        <Tag color={resolveTierColor(row.stationSize.code, row.stationSize.name)}>
          {row.stationSize.code}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status: SiteRecord["status"]) => (
        <Tag color={STATUS_COLOR[status]}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "NAS / RADIUS",
      key: "network",
      width: 160,
      ellipsis: true,
      render: (_, row) =>
        row.radiusClientIp || row.nasIdentifier || row.nasMac ? (
          <div>
            {row.radiusClientIp ? (
              <Text code style={{ fontSize: 11 }}>
                {row.radiusClientIp}
              </Text>
            ) : null}
            {row.nasIdentifier ? (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {row.nasIdentifier}
                </Text>
              </div>
            ) : null}
            {row.nasMac ? (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {row.nasMac}
                </Text>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/wifi/network/nas-devices">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Configure NAS
            </Text>
          </Link>
        ),
    },
    {
      title: "Devices",
      key: "devices",
      width: 80,
      align: "center",
      render: (_, row) => row._count?.devices ?? 0,
    },
    {
      title: "Billable",
      key: "billable",
      width: 80,
      align: "center",
      render: (_, row) =>
        row.isBillable ? <Tag color="success">Yes</Tag> : <Text type="secondary">No</Text>,
    },
    {
      title: "",
      key: "actions",
      width: 180,
      align: "right",
      fixed: "right",
      render: (_, row) => {
        const inUse = (row._count?.credentials ?? 0) > 0 || (row._count?.sales ?? 0) > 0;
        return (
          <Space size={0} onClick={(e) => e.stopPropagation()}>
            <Button type="link" size="small" onClick={() => onView(row)}>
              View
            </Button>
            <Button type="link" size="small" onClick={() => onEdit(row)}>
              Edit
            </Button>
            <Button
              type="link"
              size="small"
              danger
              disabled={inUse}
              onClick={() => onDelete(row)}
            >
              Delete
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<SiteRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1120 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No WiFi sites yet — add a site with a capacity tier to start licensing and operations."
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "site"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default SitesTable;
