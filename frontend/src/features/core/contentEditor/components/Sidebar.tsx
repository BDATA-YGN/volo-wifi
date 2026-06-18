"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Input, Skeleton, Space, Tooltip, Tree, Typography, theme } from "antd";
import {
  ApartmentOutlined,
  CaretDownFilled,
  CaretRightFilled,
  ExpandAltOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  SearchOutlined,
  ShrinkOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";

import { useEditorContext } from "../context/EditorContent";
import { AppConfig } from "../types";

const { Text, Title } = Typography;

const collectAllKeys = (nodes: DataNode[]): React.Key[] => {
  const out: React.Key[] = [];
  const walk = (list: DataNode[]) => {
    list.forEach((node) => {
      if (node.children && node.children.length > 0) {
        out.push(node.key);
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return out;
};

const Sidebar: React.FC = () => {
  const { token } = theme.useToken();
  const { jsonData, activeSection, setActiveSection, loading } =
    useEditorContext();

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  const buildTree = (data: Record<string, AppConfig>): DataNode[] => {
    const enData = data.en ?? {};
    const buildFromObject = (
      obj: Record<string, any>,
      parentKey: string,
    ): DataNode[] =>
      Object.entries(obj).map(([key, value]) => {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        const isObject = value !== null && typeof value === "object";
        if (isObject) {
          return {
            title: key,
            key: currentKey,
            children: buildFromObject(value, currentKey),
          };
        }
        return { title: key, key: currentKey, isLeaf: true };
      });
    return buildFromObject(enData, "");
  };

  const treeData = useMemo(() => buildTree(jsonData), [jsonData]);

  const totals = useMemo(() => {
    let groups = 0;
    let leaves = 0;
    const walk = (nodes: DataNode[]) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          groups += 1;
          walk(n.children);
        } else {
          leaves += 1;
        }
      });
    };
    walk(treeData);
    return { groups, leaves };
  }, [treeData]);

  useEffect(() => {
    if (treeData.length === 0) return;
    setExpandedKeys(treeData.map((n) => n.key));
  }, [treeData.length]);

  const filteredKeys = useMemo(() => {
    if (!searchValue) return null;
    const needle = searchValue.toLowerCase();
    const matches: React.Key[] = [];
    const walk = (nodes: DataNode[]) => {
      nodes.forEach((n) => {
        const key = String(n.key);
        const title = String(n.title);
        if (key.toLowerCase().includes(needle) || title.toLowerCase().includes(needle)) {
          const parts = key.split(".");
          for (let i = 0; i < parts.length; i++) {
            matches.push(parts.slice(0, i + 1).join("."));
          }
        }
        if (n.children) walk(n.children);
      });
    };
    walk(treeData);
    return Array.from(new Set(matches));
  }, [searchValue, treeData]);

  useEffect(() => {
    if (filteredKeys) {
      setExpandedKeys(filteredKeys);
      setAutoExpandParent(true);
    }
  }, [filteredKeys]);

  const decorate = (nodes: DataNode[]): DataNode[] =>
    nodes.map((n) => {
      const key = String(n.key);
      const title = String(n.title);
      const isExpanded = expandedKeys.includes(n.key);
      const hasChildren = !!n.children && n.children.length > 0;

      let renderedTitle: React.ReactNode = title;
      if (searchValue) {
        const idx = title.toLowerCase().indexOf(searchValue.toLowerCase());
        if (idx >= 0) {
          renderedTitle = (
            <span>
              {title.substring(0, idx)}
              <span
                style={{
                  color: token.colorPrimary,
                  fontWeight: 600,
                  background: token.colorPrimaryBg,
                  padding: "0 2px",
                  borderRadius: 3,
                }}
              >
                {title.substring(idx, idx + searchValue.length)}
              </span>
              {title.substring(idx + searchValue.length)}
            </span>
          );
        }
      }

      const icon = hasChildren ? (
        isExpanded ? (
          <FolderOpenOutlined style={{ color: token.colorPrimary }} />
        ) : (
          <FolderOutlined style={{ color: token.colorTextTertiary }} />
        )
      ) : (
        <FileTextOutlined style={{ color: token.colorTextTertiary }} />
      );

      const childCount = hasChildren ? n.children!.length : 0;

      const decoratedTitle = (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          {icon}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderedTitle}
          </span>
          {hasChildren && (
            <span
              style={{
                fontSize: 11,
                color: token.colorTextTertiary,
                background: token.colorFillTertiary,
                padding: "0 6px",
                borderRadius: 999,
                lineHeight: "16px",
              }}
            >
              {childCount}
            </span>
          )}
        </span>
      );

      return {
        ...n,
        title: decoratedTitle,
        children: hasChildren ? decorate(n.children!) : undefined,
      };
    });

  const decoratedTreeData = useMemo(
    () => decorate(treeData),
    [treeData, expandedKeys, searchValue, token],
  );

  const handleExpandAll = () => {
    setExpandedKeys(collectAllKeys(treeData));
    setAutoExpandParent(true);
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
    setAutoExpandParent(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: "sticky",
          top: 0,
          background: token.colorBgContainer,
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Space size={8}>
            <ApartmentOutlined style={{ color: token.colorPrimary }} />
            <Title level={5} style={{ margin: 0 }}>
              JSON Structure
            </Title>
          </Space>
          <Space size={2}>
            <Tooltip title="Expand all">
              <Button
                type="text"
                size="small"
                icon={<ExpandAltOutlined />}
                onClick={handleExpandAll}
              />
            </Tooltip>
            <Tooltip title="Collapse all">
              <Button
                type="text"
                size="small"
                icon={<ShrinkOutlined />}
                onClick={handleCollapseAll}
              />
            </Tooltip>
          </Space>
        </div>

        <Input
          allowClear
          placeholder="Search keys..."
          value={searchValue}
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          onChange={(e) => setSearchValue(e.target.value)}
          size="middle"
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 12,
            color: token.colorTextSecondary,
            fontSize: 12,
          }}
        >
          <span>
            <FolderOutlined style={{ marginRight: 4 }} />
            {totals.groups} groups
          </span>
          <span>
            <FileTextOutlined style={{ marginRight: 4 }} />
            {totals.leaves} keys
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 8px 16px" }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">
                No keys yet. Use <strong>Add Section</strong> to start.
              </Text>
            }
            style={{ marginTop: 32 }}
          />
        ) : (
          <Tree
            blockNode
            showLine={false}
            switcherIcon={({ expanded }) =>
              expanded ? <CaretDownFilled /> : <CaretRightFilled />
            }
            onSelect={(keys) => {
              if (keys.length > 0) {
                setActiveSection(String(keys[0]).split("."));
              }
            }}
            selectedKeys={[activeSection.join(".")]}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onExpand={(keys) => {
              setExpandedKeys(keys);
              setAutoExpandParent(false);
            }}
            treeData={decoratedTreeData}
            style={{ background: "transparent" }}
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
