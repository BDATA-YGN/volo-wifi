"use client";

import React from "react";
import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LicensedSiteRow } from "../types";
import { STATION_STATUS_COLOR, TIER_CODE_COLORS } from "../constant";
import { formatDate } from "../../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  sites: LicensedSiteRow[];
  loading?: boolean;
};

const LicensedSitesTable: React.FC<Props> = ({ sites, loading }) => {
  const columns: ColumnsType<LicensedSiteRow> = [
    {
      title: "Code",
      dataIndex: "code",
      width: 120,
      render: (code: string) => (
        <Text code style={{ fontSize: 12 }}>
          {code}
        </Text>
      ),
    },
    {
      title: "Site name",
      dataIndex: "name",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "Tier",
      key: "tier",
      width: 100,
      render: (_, row) => (
        <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}>
          {row.stationSize.code}
        </Tag>
      ),
    },
    {
      title: "Location",
      key: "location",
      ellipsis: true,
      render: (_, row) => row.location || row.address || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (status: string, row) => (
        <Tag color={STATION_STATUS_COLOR[status] ?? "default"}>
          {row.isBillable ? status : `${status} (non-billable)`}
        </Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 120,
      render: (v: string) => <Text type="secondary">{formatDate(v)}</Text>,
    },
  ];

  if (!loading && sites.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No sites match the current filters."
      />
    );
  }

  return (
    <Table<LicensedSiteRow>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={sites}
      pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} sites` }}
    />
  );
};

export default LicensedSitesTable;
