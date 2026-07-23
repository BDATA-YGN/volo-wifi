"use client";

import React from "react";
import { Badge, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SiteRow } from "../types";
import { STATION_STATUS_COLOR, formatBytes, formatMoney } from "../utils";
import { resolveTierColor } from "@/features/wifi/shared/tier-colors";

const { Text } = Typography;

type Props = {
  rows: SiteRow[];
  currency: string;
  loading?: boolean;
  onSelectSite?: (stationId: string) => void;
  selectedStationId?: string | null;
};

const SitesTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  onSelectSite,
  selectedStationId,
}) => {
  const columns: ColumnsType<SiteRow> = [
    {
      title: "Site",
      key: "site",
      fixed: "left",
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
            <Badge
              status={
                (STATION_STATUS_COLOR[row.status] as "success" | "warning" | "error" | "default") ??
                "default"
              }
              text={row.status}
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Tier",
      key: "tier",
      width: 120,
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 13 }}>{row.stationSizeName}</Text>
          <div>
            <Tag
              color={resolveTierColor(row.stationSizeCode, row.stationSizeName)}
              style={{ fontFamily: "monospace", marginTop: 2 }}
            >
              {row.stationSizeCode}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, currency),
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: "descend",
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
    },
    {
      title: "Data",
      key: "totalBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
      sorter: (a, b) => a.totalBytes - b.totalBytes,
    },
  ];

  return (
    <Card size="small" title="Performance by site" styles={{ body: { padding: 0 } }}>
      <Table<SiteRow>
        rowKey="stationId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: 10,
          showSizeChanger: rows.length > 10,
          showTotal: (total) => `${total} site${total === 1 ? "" : "s"}`,
        }}
        scroll={{ x: 760 }}
        onRow={(row) => ({
          onClick: onSelectSite ? () => onSelectSite(row.stationId) : undefined,
          style: {
            cursor: onSelectSite ? "pointer" : undefined,
            background:
              selectedStationId === row.stationId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default SitesTable;
