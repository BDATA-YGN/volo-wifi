"use client";

import React, { useMemo, useState } from "react";
import { Input, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { LicensedSitesOrgSummary } from "../types";

const { Text } = Typography;

type Props = {
  data: LicensedSitesOrgSummary[];
  loading?: boolean;
  onSelect: (orgId: string) => void;
};

const OrgSummaryTable: React.FC<Props> = ({ data, loading, onSelect }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      [row.org.code, row.org.name, row.license.status].join(" ").toLowerCase().includes(term)
    );
  }, [data, search]);

  const columns: ColumnsType<LicensedSitesOrgSummary> = [
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
      title: "Subscription",
      key: "status",
      width: 120,
      render: (_, row) => (
        <Tag color={row.license.status === "ACTIVE" ? "success" : "default"}>
          {row.license.status}
        </Tag>
      ),
    },
    {
      title: "Billable sites",
      key: "usage",
      width: 200,
      render: (_, row) => (
        <div style={{ minWidth: 140 }}>
          <Text style={{ fontSize: 12 }}>
            {row.license.billableCount} / {row.license.stationLimit}
          </Text>
          <Progress
            percent={row.license.usagePercent}
            size="small"
            status={
              row.license.isAtLimit ? "exception" : row.license.isNearLimit ? "active" : "normal"
            }
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: "Billing cycle",
      key: "cycle",
      width: 110,
      render: (_, row) => <Tag>{row.license.billingCycle}</Tag>,
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
      <Table<LicensedSitesOrgSummary>
        rowKey={(row) => row.org.id}
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => onSelect(record.org.id),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
};

export default OrgSummaryTable;
