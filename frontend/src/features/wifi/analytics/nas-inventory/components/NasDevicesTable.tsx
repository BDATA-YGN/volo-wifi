"use client";

import React from "react";
import Link from "next/link";
import { Card, Progress, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { NasInventoryDeviceRow } from "../types";
import { DEVICE_TYPE_COLOR } from "../constant";
import { deviceLabel, formatDeviceType, readinessColor } from "../utils";
import type { DeviceType } from "../types";

const { Text } = Typography;

type Props = {
  rows: NasInventoryDeviceRow[];
  loading?: boolean;
};

function Flag({ ok, label }: { ok: boolean; label: string }) {
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

const NasDevicesTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<NasInventoryDeviceRow> = [
    {
      title: "Device",
      key: "device",
      fixed: "left",
      width: 200,
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {deviceLabel(row.vendor, row.model, row.type)}
          </Text>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag color={DEVICE_TYPE_COLOR[row.type as DeviceType] ?? "default"} style={{ fontSize: 11 }}>
              {formatDeviceType(row.type)}
            </Tag>
            {row.isRadiusClient ? <Tag color="blue" style={{ fontSize: 11 }}>RADIUS</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: "Site",
      key: "site",
      width: 140,
      ellipsis: true,
      render: (_, row) =>
        row.stationName ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.stationCode}
          </Text>
        ) : (
          <Tag color="warning" style={{ fontSize: 11 }}>
            Unassigned
          </Tag>
        ),
    },
    {
      title: "Network",
      key: "network",
      width: 150,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          {row.ipAddr ? <div>{row.ipAddr}</div> : null}
          {row.macAddr ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.macAddr}
            </Text>
          ) : null}
          {!row.ipAddr && !row.macAddr ? <Text type="secondary">—</Text> : null}
        </div>
      ),
    },
    {
      title: "Readiness",
      key: "readiness",
      width: 120,
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
      width: 120,
      render: (_, row) => (
        <Space size={6}>
          <Flag ok={Boolean(row.stationId)} label="Assigned to site" />
          <Flag ok={Boolean(row.ipAddr)} label="IP address" />
          <Flag ok={Boolean(row.macAddr || row.serialNo)} label="MAC or serial" />
          {row.isRadiusClient ? (
            <>
              <Flag ok={row.hasRadiusSecret} label="RADIUS secret" />
              <Flag ok={Boolean(row.nasShortname)} label="NAS shortname" />
            </>
          ) : null}
        </Space>
      ),
    },
    {
      title: "NAS ID",
      key: "nas",
      width: 110,
      render: (_, row) =>
        row.nasShortname ? (
          <Text code style={{ fontSize: 11 }}>
            {row.nasShortname}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <Card
      size="small"
      title="Device fleet"
      extra={
        <Link href="/wifi/network/nas-devices">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage devices →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<NasInventoryDeviceRow>
        size="small"
        rowKey="deviceId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 12, showSizeChanger: rows.length > 12, size: "small" }}
        scroll={{ x: 960 }}
      />
    </Card>
  );
};

export default NasDevicesTable;
