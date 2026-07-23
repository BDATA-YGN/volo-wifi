"use client";

import React from "react";
import { Button, Dropdown, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import type { NasDeviceRecord } from "../types";
import { DEVICE_TYPE_COLOR } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: NasDeviceRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit: (record: NasDeviceRecord) => void;
  onDelete: (record: NasDeviceRecord) => void;
};

function deviceLabel(record: NasDeviceRecord): string {
  const parts = [record.vendor, record.model].filter(Boolean);
  return parts.length ? parts.join(" ") : record.type;
}

const NasDevicesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<NasDeviceRecord> = [
    {
      title: "Device",
      key: "device",
      render: (_, row) => (
        <div>
          <Text strong>{deviceLabel(row)}</Text>
          <div>
            <Tag color={DEVICE_TYPE_COLOR[row.type] ?? "default"}>{row.type}</Tag>
            {row.isRadiusClient ? <Tag color="blue">RADIUS</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: "Tenant / Site",
      key: "org",
      render: (_, row) => (
        <div>
          <Text>{row.org.name}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.org.code}
            </Text>
          </div>
          {row.station ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.station.name} ({row.station.code})
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No site assigned
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Network",
      key: "network",
      width: 180,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          {row.ipAddr ? <div>IP: {row.ipAddr}</div> : null}
          {row.macAddr ? <div>MAC: {row.macAddr}</div> : null}
          {!row.ipAddr && !row.macAddr ? <Text type="secondary">—</Text> : null}
        </div>
      ),
    },
    {
      title: "NAS / FreeRADIUS",
      key: "nas",
      width: 200,
      render: (_, row) =>
        row.isRadiusClient ? (
          <div style={{ fontSize: 12 }}>
            {row.nasShortname ? (
              <div>
                <Text code style={{ fontSize: 11 }}>
                  {row.nasShortname}
                </Text>
              </div>
            ) : (
              <Text type="secondary">No NAS ID</Text>
            )}
            {row.radiusProfile ? (
              <Text type="secondary">{row.radiusProfile.name}</Text>
            ) : (
              <Text type="secondary">No server</Text>
            )}
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "center",
      render: (_, row) => {
        const items: MenuProps["items"] = [
          { key: "edit", label: "Edit", onClick: () => onEdit(row) },
          { type: "divider" },
          { key: "delete", label: "Remove", danger: true, onClick: () => onDelete(row) },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  if (!loading && data.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No NAS devices yet. Add routers, access points, or RADIUS clients to your inventory."
      />
    );
  }

  return (
    <Table<NasDeviceRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "device"
      })}
    />
  );
};

export default NasDevicesTable;
