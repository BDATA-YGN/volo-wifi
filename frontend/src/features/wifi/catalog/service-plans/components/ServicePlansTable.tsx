"use client";

import React from "react";
import Link from "next/link";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ServicePlanRecord } from "../types";
import { QUOTA_TYPE_COLOR } from "../constant";
import { formatQuotaLabel, formatQuotaTypeLabel, formatValidity } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: ServicePlanRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: ServicePlanRecord) => void;
  onEdit: (record: ServicePlanRecord) => void;
  onToggleActive: (record: ServicePlanRecord, active: boolean) => void;
  onDelete: (record: ServicePlanRecord) => void;
};

const ServicePlansTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  const columns: ColumnsType<ServicePlanRecord> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Tag style={{ margin: 0, fontFamily: "monospace" }}>{row.code}</Tag>
            <Text strong>{row.name}</Text>
          </div>
          {row.description ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.description}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Quota",
      key: "quota",
      width: 180,
      render: (_, row) => (
        <div>
          <Tag color={QUOTA_TYPE_COLOR[row.quotaType]} style={{ marginBottom: 4 }}>
            {formatQuotaTypeLabel(row.quotaType)}
          </Tag>
          <div>
            <Text style={{ fontSize: 12 }}>{formatQuotaLabel(row)}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Validity",
      dataIndex: "validityDays",
      width: 90,
      render: (days: number | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatValidity(days)}
        </Text>
      ),
    },
    {
      title: "Devices",
      dataIndex: "maxDevices",
      width: 80,
      align: "center",
      render: (n: number | null) => n ?? "—",
    },
    {
      title: "Retail prices",
      key: "prices",
      width: 110,
      align: "center",
      render: (_, row) => {
        const count = row._count?.prices ?? 0;
        return count > 0 ? (
          <Tag color="success">{count}</Tag>
        ) : (
          <Link href="/wifi/catalog/retail-pricing">
            <Tag color="warning" style={{ cursor: "pointer" }}>
              Not priced
            </Tag>
          </Link>
        );
      },
    },
    {
      title: "In use",
      key: "usage",
      width: 90,
      align: "center",
      render: (_, row) => {
        const creds = row._count?.credentials ?? 0;
        return creds > 0 ? (
          <Text style={{ fontVariantNumeric: "tabular-nums" }}>{creds}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      render: (active: boolean) =>
        active ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 200,
      align: "right",
      fixed: "right",
      render: (_, row) => {
        const inUse =
          (row._count?.credentials ?? 0) > 0 || (row._count?.salesItems ?? 0) > 0;

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
              onClick={() => onToggleActive(row, !row.isActive)}
            >
              {row.isActive ? "Deactivate" : "Activate"}
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
    <Table<ServicePlanRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      // scroll={{ x: 1100 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No service plans yet — create your first retail product for tokens and vouchers."
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "plan"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default ServicePlansTable;
