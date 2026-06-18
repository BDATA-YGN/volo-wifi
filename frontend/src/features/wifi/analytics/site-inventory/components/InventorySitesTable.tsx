"use client";

import React from "react";
import Link from "next/link";
import { Card, Progress, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { SiteInventorySiteRow } from "../types";
import { STATION_STATUS_COLOR } from "../constant";
import { formatStatusLabel, readinessColor } from "../utils";
import type { StationStatus } from "../types";

const { Text } = Typography;

type Props = {
  rows: SiteInventorySiteRow[];
  loading?: boolean;
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
};

function ConfigFlag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Tooltip title={label}>
      {ok ? (
        <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 12 }} />
      ) : (
        <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 12 }} />
      )}
    </Tooltip>
  );
}

const InventorySitesTable: React.FC<Props> = ({
  rows,
  loading,
  selectedStationId,
  onSelectStation,
}) => {
  const columns: ColumnsType<SiteInventorySiteRow> = [
    {
      title: "Site",
      key: "site",
      fixed: "left",
      width: 180,
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Text strong style={{ fontSize: 13 }}>
              {row.name}
            </Text>
            <Tag
              color={STATION_STATUS_COLOR[row.status as StationStatus] ?? "default"}
              style={{ fontSize: 11 }}
            >
              {formatStatusLabel(row.status as StationStatus)}
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
            {row.code}
          </Text>
        </div>
      ),
    },
    {
      title: "Tier",
      key: "tier",
      width: 110,
      render: (_, row) => (
        <Tag style={{ fontFamily: "monospace", fontSize: 11 }}>{row.stationSizeCode}</Tag>
      ),
    },
    {
      title: "Devices",
      key: "devices",
      width: 90,
      align: "right",
      render: (_, row) => (
        <span>
          {row.deviceCount}
          {row.radiusClientCount > 0 ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {" "}
              ({row.radiusClientCount} RADIUS)
            </Text>
          ) : null}
        </span>
      ),
      sorter: (a, b) => a.deviceCount - b.deviceCount,
    },
    {
      title: "Readiness",
      key: "readiness",
      width: 130,
      render: (_, row) => (
        <Progress
          percent={row.readinessScore}
          size="small"
          strokeColor={readinessColor(row.readinessScore)}
          format={(p) => `${p}%`}
        />
      ),
      sorter: (a, b) => a.readinessScore - b.readinessScore,
      defaultSortOrder: "ascend",
    },
    {
      title: "Config",
      key: "config",
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <ConfigFlag ok={row.deviceCount > 0} label="Has devices" />
          <ConfigFlag ok={row.hasRadiusClientIp} label="RADIUS client IP" />
          <ConfigFlag ok={row.hasRadiusSecret} label="RADIUS secret" />
          <ConfigFlag ok={row.hasVendorProfile} label="Vendor profile" />
          <ConfigFlag ok={row.hasPortalUrl} label="Portal URL" />
        </Space>
      ),
    },
    {
      title: "Location",
      key: "location",
      width: 140,
      ellipsis: true,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.location ?? "—"}
        </Text>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Site roll-up"
      extra={
        <Link href="/wifi/sites">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage sites →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<SiteInventorySiteRow>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 12, showSizeChanger: rows.length > 12, size: "small" }}
        rowClassName={(row) =>
          row.stationId === selectedStationId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => onSelectStation?.(row.stationId),
          style: { cursor: onSelectStation ? "pointer" : undefined },
        })}
        scroll={{ x: 900 }}
      />
    </Card>
  );
};

export default InventorySitesTable;
