"use client";

import React, { useMemo, useState } from "react";
import { Input, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { TenantOverrideRecord } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatDateTime, formatMoney } from "../../platform/utils";

const { Text } = Typography;

type Props = {
  data: TenantOverrideRecord[];
  loading?: boolean;
};

const TenantOverrideHistoryTable: React.FC<Props> = ({ data, loading }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      [row.stationSize?.code, row.stationSize?.name, row.currency]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [data, search]);

  const columns: ColumnsType<TenantOverrideRecord> = [
    {
      title: "Tier",
      key: "tier",
      width: 100,
      render: (_, row) => (
        <Tag color={TIER_CODE_COLORS[row.stationSize?.code ?? ""] ?? "default"}>
          {row.stationSize?.code}
        </Tag>
      ),
    },
    {
      title: "Override price",
      render: (_, row) => <Text strong>{formatMoney(row.unitPrice, row.currency)}</Text>,
    },
    {
      title: "Effective from",
      dataIndex: "effectiveFrom",
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "Effective to",
      dataIndex: "effectiveTo",
      width: 170,
      render: (v: string | null) => formatDateTime(v),
    },
    {
      title: "Source",
      dataIndex: "pricingSource",
      width: 120,
      render: (v: string) => <Tag>{v.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (active: boolean) =>
        active ? <Tag color="success">Active</Tag> : <Tag>Inactive</Tag>,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Filter by tier…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 280 }}
      />
      <Table<TenantOverrideRecord>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Text type="secondary">No tenant overrides recorded — platform defaults apply.</Text>
          ),
        }}
      />
    </div>
  );
};

export default TenantOverrideHistoryTable;
