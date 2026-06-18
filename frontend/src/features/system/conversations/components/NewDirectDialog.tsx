"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Empty,
  Input,
  Modal,
  Skeleton,
  Tag,
  Typography,
  theme,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";

import type { AdminSlim } from "../interface";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  recipients: AdminSlim[];
  loading: boolean;
  onSearch: (query: string) => void;
  onSelect: (recipient: AdminSlim) => Promise<void> | void;
}

const NewDirectDialog: React.FC<Props> = ({
  open,
  onClose,
  recipients,
  loading,
  onSearch,
  onSelect,
}) => {
  const { token } = theme.useToken();
  const [search, setSearch] = useState("");

  // Debounce the upstream search so we don't hammer the API while typing.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => onSearch(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search, open, onSearch]);

  const list = useMemo(() => recipients, [recipients]);

  return (
    <Modal
      open={open}
      onCancel={() => {
        setSearch("");
        onClose();
      }}
      title="Start a direct message"
      footer={null}
      destroyOnHidden
      width={520}
    >
      <Input
        autoFocus
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search by name, username or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
        }}
      >
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : list.length === 0 ? (
          <Empty
            style={{ padding: 24 }}
            description={
              <Text type="secondary">No admins match your search.</Text>
            }
          />
        ) : (
          <div role="list">
            {list.map((admin, idx) => (
              <div
                key={admin.id}
                role="listitem"
                onClick={() => void onSelect(admin)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom:
                    idx === list.length - 1
                      ? "none"
                      : `1px solid ${token.colorBorderSecondary}`,
                  transition: "background-color 120ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    token.colorFillTertiary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <Avatar
                  src={admin.profileImage || undefined}
                  style={{
                    flexShrink: 0,
                    backgroundColor: token.colorPrimary,
                  }}
                >
                  {admin.fullName?.[0]?.toUpperCase() || "?"}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <Text strong>{admin.fullName}</Text>
                    {admin.role?.roleName && (
                      <Tag color="blue" style={{ marginRight: 0 }}>
                        {admin.role.roleName}
                      </Tag>
                    )}
                    {admin.isOnline && (
                      <Tag color="green" style={{ marginRight: 0 }}>
                        Online
                      </Tag>
                    )}
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginTop: 2 }}
                  >
                    {admin.username}
                    {admin.email ? ` · ${admin.email}` : ""}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NewDirectDialog;
