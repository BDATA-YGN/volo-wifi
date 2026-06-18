"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input, Progress, Table, Tag, Typography } from "antd";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { SubscriptionRecord } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatDate } from "../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  data: SubscriptionRecord[];
  loading?: boolean;
  selectedOrgId?: string | null;
  onSelect: (orgId: string) => void;
};

const SubscriptionListTable: React.FC<Props> = ({
  data,
  loading,
  selectedOrgId,
  onSelect,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      [row.org.code, row.org.name, row.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [data, search]);

  const columns: ColumnsType<SubscriptionRecord> = [
    {
      title: "Tenant",
      key: "org",
      render: (_, row) => (
        <div>
          <Text strong>{row.org.name}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.org.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (status: string) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
    },
    {
      title: "Site usage",
      key: "usage",
      width: 200,
      render: (_, row) => (
        <div style={{ minWidth: 140 }}>
          <Text style={{ fontSize: 12 }}>
            {row.activeStationCount} / {row.stationLimit} sites
          </Text>
          <Progress
            percent={row.usagePercent}
            size="small"
            status={row.isAtLimit ? "exception" : row.isNearLimit ? "active" : "normal"}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: "Billing",
      key: "billing",
      width: 100,
      render: (_, row) => <Tag>{row.billingCycle}</Tag>,
    },
    {
      title: "Effective",
      dataIndex: "effectiveFrom",
      width: 120,
      render: (v: string) => <Text type="secondary">{formatDate(v)}</Text>,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search tenant…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      <Table<SubscriptionRecord>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={buildWifiTablePagination({
          page,
          pageSize,
          total: filtered.length,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
          itemLabel: "tenant",
        })}
        onRow={(record) => ({
          onClick: () => onSelect(record.orgId),
          style: {
            cursor: "pointer",
            background: record.orgId === selectedOrgId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </div>
  );
};

export default SubscriptionListTable;
