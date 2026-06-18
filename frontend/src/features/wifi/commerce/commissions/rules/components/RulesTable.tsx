"use client";

import React from "react";
import { Button, Empty, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CommissionRuleRecord } from "../types";
import { TYPE_COLOR } from "../constant";
import { formatCommissionValue } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: CommissionRuleRecord[];
  currency: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: CommissionRuleRecord) => void;
  onEdit: (record: CommissionRuleRecord) => void;
  onDelete: (record: CommissionRuleRecord) => void;
  onToggleActive: (record: CommissionRuleRecord, active: boolean) => void;
};

const RulesTable: React.FC<Props> = ({
  data,
  currency,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const columns: ColumnsType<CommissionRuleRecord> = [
    {
      title: "Scope",
      key: "scope",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.scopeLabel}
          </Text>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.reseller ? (
              <Tag style={{ fontFamily: "monospace", margin: 0 }}>{row.reseller.code}</Tag>
            ) : null}
            {row.plan ? (
              <Tag style={{ fontFamily: "monospace", margin: 0 }}>{row.plan.code}</Tag>
            ) : null}
            {!row.reseller && !row.plan ? (
              <Tag color="default">Default</Tag>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "Commission",
      key: "value",
      width: 130,
      render: (_, row) => (
        <div>
          <Tag color={TYPE_COLOR[row.type]}>{row.type}</Tag>
          <div>
            <Text strong>
              {formatCommissionValue(row.type, row.value, row.valuePercent, currency)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Active",
      key: "active",
      width: 80,
      align: "center",
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.isActive}
          onChange={(checked, e) => {
            e.stopPropagation();
            onToggleActive(row, checked);
          }}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(row)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<CommissionRuleRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: <Empty description="No commission rules configured" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "rule"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default RulesTable;
