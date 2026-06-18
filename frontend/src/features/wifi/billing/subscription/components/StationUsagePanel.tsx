"use client";

import React from "react";
import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { StationUsageByTier } from "../types";
import { TIER_CODE_COLORS } from "../../tier-rates/tenant/constant";

const { Text } = Typography;

type Props = {
  data: StationUsageByTier[];
  loading?: boolean;
};

const StationUsagePanel: React.FC<Props> = ({ data, loading }) => {
  const columns: ColumnsType<StationUsageByTier> = [
    {
      title: "Tier",
      key: "tier",
      render: (_, row) => (
        <Tag color={TIER_CODE_COLORS[row.stationSize.code] ?? "default"}>
          {row.stationSize.code}
        </Tag>
      ),
    },
    {
      title: "Name",
      dataIndex: ["stationSize", "name"],
    },
    {
      title: "Active sites",
      dataIndex: "count",
      align: "right",
      render: (count: number) => <Text strong>{count}</Text>,
    },
  ];

  if (!loading && data.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No licensed sites yet. Sites count toward the subscription limit when active."
      />
    );
  }

  return (
    <Table<StationUsageByTier>
      rowKey={(r) => r.stationSize.id}
      size="small"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};

export default StationUsagePanel;
