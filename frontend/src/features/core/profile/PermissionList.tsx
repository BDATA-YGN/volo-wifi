"use client";

import React, { useMemo, useState } from "react";
import { Card, Empty, Input, Space, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface PermissionListProps {
  title: string;
  permissions: string[];
  color?: string;
  description?: string;
  searchable?: boolean;
}

const PermissionList: React.FC<PermissionListProps> = ({
  title,
  permissions,
  color = "blue",
  description,
  searchable,
}) => {
  const [keyword, setKeyword] = useState("");
  const trimmed = keyword.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return permissions;
    return permissions.filter((p) => p.toLowerCase().includes(trimmed));
  }, [permissions, trimmed]);

  return (
    <Card
      variant="borderless"
      title={
        <Space size={8} align="center">
          <span style={{ fontWeight: 600 }}>{title}</span>
          <Tag style={{ marginInlineEnd: 0 }}>{permissions.length}</Tag>
        </Space>
      }
      extra={
        searchable && permissions.length > 6 ? (
          <Input
            size="small"
            allowClear
            placeholder="Search"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 180 }}
          />
        ) : null
      }
    >
      {description ? (
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          {description}
        </Text>
      ) : null}

      {filtered.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={trimmed ? "No matching items" : "No items"}
          style={{ margin: "12px 0" }}
        />
      ) : (
        <Space size={[8, 8]} wrap>
          {filtered.map((permission) => (
            <Tag key={permission} color={color} style={{ fontSize: 12, padding: "2px 10px" }}>
              {permission}
            </Tag>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default PermissionList;
