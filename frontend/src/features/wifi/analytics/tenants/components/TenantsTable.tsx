"use client";

import React from "react";
import { Badge, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TenantRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: TenantRow[];
  loading?: boolean;
  onSelectTenant?: (orgId: string) => void;
  selectedOrgId?: string | null;
};

const TenantsTable: React.FC<Props> = ({ rows, loading, onSelectTenant, selectedOrgId }) => {
  const columns: ColumnsType<TenantRow> = [
    {
      title: "Tenant",
      key: "tenant",
      fixed: "left",
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.code}</Tag>
            <Badge
              status={row.isActive ? "success" : "default"}
              text={row.isActive ? "Active" : "Inactive"}
              style={{ marginLeft: 8, fontSize: 12 }}
            />
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
      defaultSortOrder: undefined,
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 130,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, row.currency),
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: "descend",
    },
    {
      title: "Commission",
      key: "commission",
      width: 130,
      align: "right",
      render: (_, row) => formatMoney(row.commission, row.currency),
      sorter: (a, b) => a.commission - b.commission,
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
    },
    {
      title: "Partners",
      dataIndex: "partnerCount",
      key: "partnerCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.partnerCount - b.partnerCount,
    },
    {
      title: "Sites",
      dataIndex: "stationCount",
      key: "stationCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.stationCount - b.stationCount,
    },
  ];

  return (
    <Card size="small" title="Tenant ranking" styles={{ body: { padding: 0 } }}>
      <Table<TenantRow>
        rowKey="orgId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: 10,
          showSizeChanger: rows.length > 10,
          showTotal: (total) => `${total} tenant${total === 1 ? "" : "s"}`,
        }}
        scroll={{ x: 800 }}
        onRow={(row) => ({
          onClick: onSelectTenant ? () => onSelectTenant(row.orgId) : undefined,
          style: {
            cursor: onSelectTenant ? "pointer" : undefined,
            background: selectedOrgId === row.orgId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default TenantsTable;
