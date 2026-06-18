"use client";

import React from "react";
import Link from "next/link";
import { Button, Empty, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { TenantRecord } from "../types";
import { STATUS_COLOR } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: TenantRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: TenantRecord) => void;
  onEdit: (record: TenantRecord) => void;
};

const TenantsTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
}) => {
  const columns: ColumnsType<TenantRecord> = [
    {
      title: "Tenant",
      key: "tenant",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.code}
            </Text>
            {!row.isActive ? (
              <Tag color="default" className="ml-2">
                Inactive
              </Tag>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "Subscription",
      key: "license",
      width: 120,
      render: (_, row) =>
        row.orgLicense ? (
          <Tag color={STATUS_COLOR[row.orgLicense.status]}>{row.orgLicense.status}</Tag>
        ) : (
          <Tag color="default">None</Tag>
        ),
    },
    {
      title: "Site usage",
      key: "usage",
      width: 200,
      render: (_, row) =>
        row.orgLicense ? (
          <div style={{ minWidth: 140 }}>
            <Text style={{ fontSize: 12 }}>
              {row.activeStationCount} / {row.orgLicense.stationLimit} licensed
            </Text>
            <Progress
              percent={row.usagePercent}
              size="small"
              status={row.isAtLimit ? "exception" : row.isNearLimit ? "active" : "normal"}
              showInfo={false}
            />
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.activeStationCount} active site{row.activeStationCount === 1 ? "" : "s"}
          </Text>
        ),
    },
    {
      title: "Members",
      dataIndex: "memberCount",
      width: 90,
      align: "right",
      render: (n: number) => <Text>{n}</Text>,
    },
    {
      title: "Currency",
      dataIndex: "currency",
      width: 80,
      render: (c: string) => <Text code style={{ fontSize: 11 }}>{c}</Text>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 110,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(v).format("MMM D, YYYY")}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 200,
      align: "right",
      fixed: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Link href={`/wifi/billing/subscription?orgId=${row.id}`}>
            <Button type="link" size="small">
              Billing
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <Table<TenantRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1050 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No tenants match the current filters"
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "tenant"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default TenantsTable;
