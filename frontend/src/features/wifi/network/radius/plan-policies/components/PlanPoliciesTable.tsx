"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PlanPolicyGroupRecord } from "../types";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PlanPolicyGroupRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit: (record: PlanPolicyGroupRecord) => void;
  onDelete: (record: PlanPolicyGroupRecord) => void;
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
  const columns: ColumnsType<PlanPolicyGroupRecord> = [
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
      title: "Scope",
      key: "scope",
      width: 220,
      render: (_, row) => {
        const stations = row.wifiStations?.length
          ? row.wifiStations
          : row.wifiStation
            ? [row.wifiStation]
            : [];
        if (!stations.length || row.isGlobal) {
          return <Tag color="blue">All sites (global)</Tag>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            <Tag>Site override</Tag>
            {stations.slice(0, 3).map((s) => (
              <Tag key={s.id} style={{ fontSize: 11 }}>
                {s.code}
              </Tag>
            ))}
            {stations.length > 3 ? (
              <Tag style={{ fontSize: 11 }}>+{stations.length - 3}</Tag>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Vendor profile",
      key: "vendor",
      width: 160,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 12 }}>{row.vendorProfile.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.vendorProfile.vendor}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Attributes",
      key: "attrs",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          <Tag color="cyan">{row.attributeCount}</Tag>
          {(row.attributes ?? []).slice(0, 4).map((attr) => (
            <Tag key={`${attr.phase}-${attr.attributeName}`} style={{ fontSize: 11 }}>
              <Text code style={{ fontSize: 11 }}>
                {attr.attributeName}
              </Text>
            </Tag>
          ))}
          {row.attributeCount > 4 ? (
            <Tag style={{ fontSize: 11 }}>+{row.attributeCount - 4}</Tag>
          ) : null}
        </div>
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
        description="No plan RADIUS policies yet. Create a policy for a plan + vendor profile, then add attribute rows."
      />
    );
  }

  return (
    <Table<PlanPolicyGroupRecord>
      rowKey={(r) => r.policyBundleId || r.groupKey}
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "policy",
      })}
      onRow={(record) => ({
        onClick: () => onEdit(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PlanPoliciesTable;
