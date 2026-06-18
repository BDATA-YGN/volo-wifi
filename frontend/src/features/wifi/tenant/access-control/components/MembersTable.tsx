"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { OrgMemberRecord } from "../types";
import { formatMemberRoleLabel, normalizeMemberRoleCode, STATUS_COLOR } from "../constant";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: OrgMemberRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: OrgMemberRecord) => void;
  onEdit: (record: OrgMemberRecord) => void;
  onRemove: (record: OrgMemberRecord) => void;
};

const MembersTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onEdit,
  onRemove,
}) => {
  const columns: ColumnsType<OrgMemberRecord> = [
    {
      title: "Member",
      key: "member",
      render: (_, row) => (
        <div>
          <Text strong>{row.admin.fullName}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.admin.username}
            </Text>
            {row.isPrimary ? (
              <Tag color="blue" className="ml-2">
                Primary
              </Tag>
            ) : null}
          </div>
          {row.title ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.title}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (status: string) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
    },
    {
      title: "Roles",
      key: "roles",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Tag
              key={role.id}
              color={
                row.isPrimary && normalizeMemberRoleCode(role.roleCode) === "ORG_ADMIN"
                  ? "gold"
                  : "default"
              }
            >
              {formatMemberRoleLabel(role.roleCode)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Site scope",
      key: "sites",
      width: 120,
      render: (_, row) =>
        row.stationScopes.length ? (
          <Text style={{ fontSize: 12 }}>{row.stationScopes.length} site(s)</Text>
        ) : (
          <Text type="secondary">All sites</Text>
        ),
    },
    {
      title: "Last login",
      key: "lastLogin",
      width: 120,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.admin.lastLogin ? dayjs(row.admin.lastLogin).format("MMM D, HH:mm") : "—"}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 160,
      align: "right",
      fixed: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => onRemove(row)}>
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<OrgMemberRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 980 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No team members yet — provision the first internal account"
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "member"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default MembersTable;
