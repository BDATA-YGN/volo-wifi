"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PlanPolicyRecord } from "../types";
import { PHASE_COLOR, VALUE_TYPE_COLOR } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PlanPolicyRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit: (record: PlanPolicyRecord) => void;
  onDelete: (record: PlanPolicyRecord) => void;
};

const PlanPoliciesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<PlanPolicyRecord> = [
    {
      title: "Priority",
      dataIndex: "priority",
      width: 80,
      align: "right",
      render: (p: number) => <Text strong>{p}</Text>,
    },
    {
      title: "Plan / Tenant",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong>{row.plan.name}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.plan.code}
            </Text>
            <Text type="secondary" className="ml-2" style={{ fontSize: 11 }}>
              {row.org.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Attribute",
      key: "attr",
      render: (_, row) => (
        <div>
          <Text code style={{ fontSize: 12 }}>
            {row.attributeName}
          </Text>
          <div>
            <Tag color={PHASE_COLOR[row.phase]}>{row.phase}</Tag>
            <Tag color={VALUE_TYPE_COLOR[row.valueType] ?? "default"}>{row.valueType}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Value",
      key: "value",
      render: (_, row) => (
        <Text>
          <Text code>{row.op}</Text> {row.value}
        </Text>
      ),
    },
    {
      title: "Scope",
      key: "scope",
      width: 160,
      render: (_, row) =>
        row.wifiStation ? (
          <div>
            <Text style={{ fontSize: 12 }}>{row.wifiStation.name}</Text>
            <div>
              <Tag>Site override</Tag>
            </div>
          </div>
        ) : (
          <Tag>All sites</Tag>
        ),
    },
    {
      title: "Vendor profile",
      key: "vendor",
      width: 140,
      ellipsis: true,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.vendorProfile.name}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      align: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(row)}>
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  if (!loading && data.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No plan RADIUS policies yet. Map reply attributes to WiFi plans per vendor profile."
      />
    );
  }

  return (
    <Table<PlanPolicyRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "rule"
      })}
      onRow={(record) => ({
        onClick: () => onEdit(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PlanPoliciesTable;
