"use client";

import React, { useMemo, useState } from "react";
import { Input, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { PlatformTierRateRecord } from "../types";
import { TIER_CODE_COLORS } from "../constant";
import { formatDateTime, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  data: PlatformTierRateRecord[];
  loading?: boolean;
};

const RateHistoryTable: React.FC<Props> = ({ data, loading }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) => {
      const haystack = [
        row.stationSize?.code,
        row.stationSize?.name,
        row.currency,
        row.billingCycle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data, search]);

  const columns: ColumnsType<PlatformTierRateRecord> = [
    {
      title: "Tier",
      key: "tier",
      width: 140,
      render: (_, row) => (
        <Tag color={TIER_CODE_COLORS[row.stationSize?.code ?? ""] ?? "default"} style={{ margin: 0 }}>
          {row.stationSize?.code}
        </Tag>
      ),
    },
    {
      title: "Unit price",
      key: "price",
      render: (_, row) => (
        <Text strong>{formatMoney(row.unitPrice, row.currency)}</Text>
      ),
    },
    {
      title: "Cycle",
      dataIndex: "billingCycle",
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
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
      title: "Status",
      dataIndex: "isActive",
      width: 100,
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
        placeholder="Filter history by tier or currency…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      <Table<PlatformTierRateRecord>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default RateHistoryTable;
