"use client";

import React, { useEffect, useState } from "react";
import { Button, Descriptions, Drawer, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { EditOutlined } from "@ant-design/icons";
import type { MemberRole, OrgMemberRecord } from "../types";
import { ROLE_OPTIONS, STATUS_COLOR } from "../constant";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  memberId: string | null;
  fallback?: OrgMemberRecord | null;
  onClose: () => void;
  onEdit: (member: OrgMemberRecord) => void;
  loadMember: (id: string) => Promise<OrgMemberRecord>;
};

const MemberDetailDrawer: React.FC<Props> = ({
  open,
  memberId,
  fallback,
  onClose,
  onEdit,
  loadMember,
}) => {
  const [member, setMember] = useState<OrgMemberRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !memberId) {
      setMember(null);
      return;
    }
    if (fallback?.id === memberId) setMember(fallback);
    setLoading(true);
    void loadMember(memberId)
      .then(setMember)
      .catch(() => {
        if (fallback?.id === memberId) setMember(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, memberId, fallback, loadMember]);

  const row = member;

  const roleColumns: ColumnsType<MemberRole> = [
    {
      title: "Role",
      dataIndex: "roleCode",
      render: (code: string) =>
        ROLE_OPTIONS.find((o) => o.value === code)?.label ?? code,
    },
    {
      title: "Scope",
      dataIndex: "scopeKey",
      render: (scope: string) => (scope ? scope : "Organization-wide"),
    },
  ];

  return (
    <Drawer
      title="Member details"
      size={520}
      open={open}
      onClose={onClose}
      destroyOnClose={false}
      extra={
        row ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(row)}>
            Edit
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {row.admin.fullName}
              </Title>
              <div className="mt-2 flex flex-wrap gap-2">
                <Text code>{row.admin.username}</Text>
                <Tag color={STATUS_COLOR[row.status]}>{row.status}</Tag>
                {row.isPrimary ? <Tag color="blue">Primary</Tag> : null}
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Email">{row.admin.email ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Phone">{row.admin.phoneNumber ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Title">{row.title ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Console account">
                {row.admin.isActive ? "Active" : "Inactive"}
                {row.admin.isBlocked ? " (blocked)" : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Joined">
                {row.joinedAt ? dayjs(row.joinedAt).format("YYYY-MM-DD HH:mm") : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Last login">
                {row.admin.lastLogin
                  ? dayjs(row.admin.lastLogin).format("YYYY-MM-DD HH:mm")
                  : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
              Roles
            </Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={roleColumns}
              dataSource={row.roles}
            />

            <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
              Site allow-list
            </Title>
            {row.stationScopes.length ? (
              <ul className="m-0 pl-5">
                {row.stationScopes.map((scope) => (
                  <li key={scope.id}>
                    <Text>
                      {scope.station.name}{" "}
                      <Text type="secondary" code style={{ fontSize: 11 }}>
                        {scope.station.code}
                      </Text>
                    </Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">No site restriction — org-wide access per role.</Text>
            )}
          </>
        ) : (
          !loading && <Text type="secondary">Member not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default MemberDetailDrawer;
