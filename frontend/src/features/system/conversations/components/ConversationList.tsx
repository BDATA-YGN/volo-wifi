"use client";

import React, { useMemo } from "react";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Segmented,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  AudioOutlined,
  EditOutlined,
  NotificationOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  KIND_COLOR,
  KIND_LABEL,
  type ConversationKind,
} from "../constant";
import type { ConversationRecord, InboxFilter } from "../interface";

dayjs.extend(relativeTime);

const { Text } = Typography;

type SegKind = ConversationKind | "ALL";

interface Props {
  currentUserId: string | undefined;
  conversations: ConversationRecord[];
  loading: boolean;
  filter: InboxFilter;
  onFilterChange: (next: InboxFilter) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewDirect: () => void;
  onNewBroadcast: () => void;
}

const ConversationList: React.FC<Props> = ({
  currentUserId,
  conversations,
  loading,
  filter,
  onFilterChange,
  activeId,
  onSelect,
  onNewDirect,
  onNewBroadcast,
}) => {
  const { token } = theme.useToken();

  const list = useMemo(() => {
    const q = (filter.search || "").trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.title?.toLowerCase().includes(q)) return true;
      if (c.lastMessage?.content?.toLowerCase().includes(q)) return true;
      return c.participants.some((p) =>
        p.admin.fullName?.toLowerCase().includes(q),
      );
    });
  }, [conversations, filter.search]);

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
      <div style={{ padding: 16, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div className="flex items-center justify-between mb-3">
          <Text strong style={{ fontSize: 16 }}>
            Conversations
          </Text>
          <div className="flex gap-2">
            <Tooltip title="Start a direct message">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={onNewDirect}
              />
            </Tooltip>
            <Tooltip title="Send broadcast">
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={onNewBroadcast}
              >
                Broadcast
              </Button>
            </Tooltip>
          </div>
        </div>
        <Input
          allowClear
          placeholder="Search by name, title or message…"
          prefix={<SearchOutlined />}
          value={filter.search || ""}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        />
        <div style={{ marginTop: 12 }}>
          <Segmented<SegKind>
            block
            value={(filter.kind as SegKind) ?? "ALL"}
            onChange={(v) => onFilterChange({ ...filter, kind: v as SegKind })}
            options={[
              { label: "All", value: "ALL" },
              {
                label: (
                  <span>
                    <AudioOutlined style={{ marginRight: 4 }} />
                    Direct
                  </span>
                ),
                value: "DIRECT",
              },
              {
                label: (
                  <span>
                    <NotificationOutlined style={{ marginRight: 4 }} />
                    Broadcast
                  </span>
                ),
                value: "BROADCAST",
              },
            ]}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : list.length === 0 ? (
          <Empty
            style={{ marginTop: 64 }}
            description={
              <span style={{ color: token.colorTextSecondary }}>
                No conversations yet. Start a DM or send a broadcast.
              </span>
            }
          />
        ) : (
          <div role="list">
            {list.map((item) => {
              const other = pickPeerLabel(item, currentUserId);
              const isActive = activeId === item.id;
              const isBroadcast = item.kind === "BROADCAST";
              return (
                <div
                  key={item.id}
                  role="listitem"
                  onClick={() => onSelect(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? token.colorPrimaryBg
                      : "transparent",
                    borderLeft: isActive
                      ? `3px solid ${token.colorPrimary}`
                      : "3px solid transparent",
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    transition: "background-color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        token.colorFillTertiary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        "transparent";
                    }
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {isBroadcast ? (
                      <Badge count={item.unreadCount} size="small">
                        <Avatar
                          style={{ backgroundColor: token.colorWarning }}
                          icon={<NotificationOutlined />}
                        />
                      </Badge>
                    ) : (
                      <Badge count={item.unreadCount} size="small">
                        <Avatar
                          src={other.avatar || undefined}
                          style={{ backgroundColor: token.colorPrimary }}
                        >
                          {initials(other.label)}
                        </Avatar>
                      </Badge>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{
                          fontWeight: item.unreadCount > 0 ? 600 : 500,
                          color: token.colorText,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 180,
                        }}
                      >
                        {isBroadcast
                          ? item.title || "Broadcast"
                          : other.label}
                      </span>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, whiteSpace: "nowrap" }}
                      >
                        {item.lastMessageAt
                          ? dayjs(item.lastMessageAt).fromNow(true)
                          : ""}
                      </Text>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      style={{ marginTop: 4 }}
                    >
                      <Tag
                        color={KIND_COLOR[item.kind]}
                        style={{ marginRight: 0, fontSize: 10 }}
                      >
                        {KIND_LABEL[item.kind]}
                      </Tag>
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {item.lastMessage?.content || "No messages yet"}
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function pickPeerLabel(
  conv: ConversationRecord,
  currentUserId: string | undefined,
): { label: string; avatar: string | null } {
  if (conv.kind === "DIRECT") {
    const peer = conv.participants.find(
      (p) => p.adminId !== currentUserId,
    )?.admin;
    return {
      label: peer?.fullName || peer?.username || "Unknown",
      avatar: peer?.profileImage || null,
    };
  }
  // Broadcast / group: prefer title, fall back to creator name.
  const owner = conv.participants.find((p) => p.isOwner)?.admin;
  return {
    label:
      conv.title || `From ${owner?.fullName || owner?.username || "system"}`,
    avatar: null,
  };
}

export default ConversationList;
