"use client";

import React, { useMemo, useState } from "react";
import { Card, Empty, Input, Space, Spin, Tag, Typography, theme } from "antd";
import {
  KeyOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export interface RoleListItem {
  roleId: number;
  roleName: string;
  description?: string | null;
}

interface Props {
  roles: RoleListItem[];
  loading?: boolean;
  selectedRoleId?: number | null;
  onSelect: (roleId: number) => void;
  /** Optional per-role permission counts: `{ [roleId]: { granted, total } }`. */
  countsByRole?: Record<number, { granted: number; total: number } | undefined>;
}

const RoleListPanel: React.FC<Props> = ({
  roles,
  loading,
  selectedRoleId,
  onSelect,
  countsByRole,
}) => {
  const { token } = theme.useToken();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.toLowerCase().trim();
    return roles.filter(
      (r) =>
        r.roleName.toLowerCase().includes(q) ||
        String(r.roleId).includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, query]);

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        height: "100%",
      }}
      styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" } }}
    >
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Space align="center" className="mb-3" size={8}>
          <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
          <Text strong>Roles</Text>
          <Tag color="blue" style={{ margin: 0 }}>
            {roles.length}
          </Tag>
        </Space>

        <Input
          allowClear
          placeholder="Search roles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No roles"
            style={{ padding: 32 }}
          />
        ) : (
          filtered.map((role) => {
            const isSelected = role.roleId === selectedRoleId;
            const counts = countsByRole?.[role.roleId];
            return (
              <div
                key={role.roleId}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(role.roleId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(role.roleId);
                  }
                }}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderLeft: `3px solid ${
                    isSelected ? token.colorPrimary : "transparent"
                  }`,
                  background: isSelected ? token.colorPrimaryBg : "transparent",
                  transition:
                    "background 120ms ease, border-color 120ms ease",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background =
                      token.colorFillQuaternary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }
                }}
              >
                <Space align="center" size={6} wrap>
                  <KeyOutlined
                    style={{
                      color: isSelected
                        ? token.colorPrimary
                        : token.colorTextTertiary,
                    }}
                  />
                  <Text
                    strong={isSelected}
                    style={{
                      color: isSelected ? token.colorPrimary : undefined,
                    }}
                  >
                    {role.roleName}
                  </Text>
                  <Tag style={{ margin: 0 }}>ID {role.roleId}</Tag>
                </Space>

                {(role.description || counts) && (
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {role.description ? (
                      <Text
                        type="secondary"
                        ellipsis
                        style={{ fontSize: 12, flex: 1 }}
                        title={role.description}
                      >
                        {role.description}
                      </Text>
                    ) : (
                      <span />
                    )}
                    {counts && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, whiteSpace: "nowrap" }}
                      >
                        {counts.granted}/{counts.total}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default RoleListPanel;
