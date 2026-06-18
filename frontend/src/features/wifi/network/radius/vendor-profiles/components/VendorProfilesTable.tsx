"use client";

import React from "react";
import { Button, Dropdown, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import type { VendorProfileRecord } from "../types";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: VendorProfileRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: VendorProfileRecord) => void;
  onEdit: (record: VendorProfileRecord) => void;
  onDelete: (record: VendorProfileRecord) => void;
};

const VendorProfilesTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnsType<VendorProfileRecord> = [
    {
      title: "Profile",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          {row.description ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.description}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Vendor",
      key: "vendor",
      width: 160,
      render: (_, row) => (
        <div>
          <Text>{row.vendor}</Text>
          {row.model ? (
            <div>
              <Text type="secondary" code style={{ fontSize: 11 }}>
                {row.model}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "CoA",
      key: "coa",
      width: 100,
      render: (_, row) =>
        row.supportsCoA ? (
          <Tag color="blue">:{row.coaPort ?? 3799}</Tag>
        ) : (
          <Tag>Off</Tag>
        ),
    },
    {
      title: "Attributes",
      key: "attrs",
      width: 100,
      align: "right",
      render: (_, row) => <Text strong>{row._count.supportedAttributeRows}</Text>,
    },
    {
      title: "Sites",
      key: "sites",
      width: 80,
      align: "right",
      render: (_, row) => row._count.wifiStations,
    },
    {
      title: "Plans",
      key: "plans",
      width: 80,
      align: "right",
      render: (_, row) => row._count.planAttributes,
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "center",
      render: (_, row) => {
        const items: MenuProps["items"] = [
          { key: "view", label: "View details", onClick: () => onView(row) },
          { key: "edit", label: "Edit", onClick: () => onEdit(row) },
          { type: "divider" },
          {
            key: "delete",
            label: "Remove",
            danger: true,
            disabled: row._count.wifiStations > 0 || row._count.planAttributes > 0,
            onClick: () => onDelete(row),
          },
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
        description="No vendor profiles yet. Define RADIUS capability sets for your NAS hardware."
      />
    );
  }

  return (
    <Table<VendorProfileRecord>
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
        itemLabel: "profile"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default VendorProfilesTable;
