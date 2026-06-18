"use client";

import React, { useMemo, useState } from "react";
import { Input, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { ChangelogOrgSummary } from "../types";
import { formatDateTime } from "../../../tier-rates/platform/utils";
import { formatChangeType } from "../utils";

const { Text } = Typography;

type Props = {
  data: ChangelogOrgSummary[];
  loading?: boolean;
  onSelect: (orgId: string) => void;
};

const OrgSummaryTable: React.FC<Props> = ({ data, loading, onSelect }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      [row.org.code, row.org.name].join(" ").toLowerCase().includes(term)
    );
  }, [data, search]);

  const columns: ColumnsType<ChangelogOrgSummary> = [
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
      width: 110,
      render: (_, row) => (
        <Tag color={row.license.status === "ACTIVE" ? "success" : "default"}>
          {row.license.status}
        </Tag>
      ),
    },
    {
      title: "Entries",
      dataIndex: "historyCount",
      width: 90,
      align: "right",
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: "Last change",
      key: "last",
      width: 200,
      render: (_, row) =>
        row.lastChangeAt ? (
          <div>
            <Text style={{ fontSize: 12 }}>{formatDateTime(row.lastChangeAt)}</Text>
            {row.lastChangeType ? (
              <div>
                <Tag style={{ marginTop: 4 }}>{formatChangeType(row.lastChangeType)}</Tag>
              </div>
            ) : null}
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
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
      <Table<ChangelogOrgSummary>
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
