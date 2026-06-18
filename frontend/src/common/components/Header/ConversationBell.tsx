"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Avatar,
  Badge,
  Button,
  Dropdown,
  Empty,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  MessageOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAuthStore } from "@/features/core/auth/store";
import { useSocketEvent } from "@/lib/socket/SocketProvider";
import {
  CONVERSATION_SOCKET_EVENTS,
  HR_CONVERSATION_READ_DOM_EVENT,
  KIND_COLOR,
  KIND_LABEL,
} from "@/features/system/conversations/constant";
import type {
  ConversationReadEvent,
  ConversationRecord,
  NewMessageEvent,
} from "@/features/system/conversations/interface";
import { getInbox } from "@/features/system/conversations/query";

dayjs.extend(relativeTime);

const { Text } = Typography;

const PREVIEW_LIMIT = 4;

/**
 * Header dropdown that surfaces the latest 4 conversations and an unread
 * badge. Lives next to `<NotificationSystem />` and is intentionally
 * read-only — clicking an item deep-links to `/system/conversations?id=...`
 * so the full feature still owns the chat surface.
 */
const ConversationBell: React.FC = () => {
  const router = useRouter();
  const { token } = theme.useToken();
  const { notification } = App.useApp();
  const { authData } = useAuthStore();
  const currentUserId = authData?.id;

  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Suppress toasts for the very first fetch — we don't want every backlog
  // message to fan out a notification when the user lands on the page.
  const seededRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await getInbox({ kind: "ALL", limit: 12 });
      setConversations((res.data as ConversationRecord[]) ?? []);
      seededRef.current = true;
    } catch {
      // The header should never crash the layout on a flaky network hop;
      // the dropdown will simply stay empty until the next refresh.
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    void refresh();
  }, [currentUserId, refresh]);

  // Same-tab: `useConversations` emits this after `markRead` succeeds so the
  // bell clears without waiting for the socket echo.
  useEffect(() => {
    const onDomRead = () => {
      void refresh();
    };
    window.addEventListener(HR_CONVERSATION_READ_DOM_EVENT, onDomRead);
    return () =>
      window.removeEventListener(HR_CONVERSATION_READ_DOM_EVENT, onDomRead);
  }, [refresh]);

  // Live updates: refresh the cached list whenever a new message lands or
  // the inbox upsert event fires (add / remove / new thread).
  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.NEW_MESSAGE,
    (payload: NewMessageEvent) => {
      if (!payload?.conversationId || !payload.message) return;
      void refresh();
      if (
        seededRef.current &&
        payload.message.senderId !== currentUserId
      ) {
        notification.info({
          key: `conv-${payload.conversationId}`,
          title: payload.message.sender?.fullName || "New message",
          description: payload.message.content,
          placement: "topRight",
          icon: <MessageOutlined style={{ color: token.colorPrimary }} />,
          onClick: () => {
            setDropdownOpen(false);
            router.push(
              `/system/conversations?id=${encodeURIComponent(payload.conversationId)}`,
            );
            notification.destroy(`conv-${payload.conversationId}`);
          },
        });
      }
    },
    [refresh, currentUserId, notification, router, token.colorPrimary],
  );

  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.UPSERT,
    () => {
      void refresh();
    },
    [refresh],
  );

  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.READ,
    (_payload: ConversationReadEvent) => {
      void refresh();
    },
    [refresh],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const preview = useMemo(
    () => conversations.slice(0, PREVIEW_LIMIT),
    [conversations],
  );

  const goToInbox = useCallback(() => {
    setDropdownOpen(false);
    router.push("/system/conversations");
  }, [router]);

  const goToConversation = useCallback(
    (id: string) => {
      setDropdownOpen(false);
      router.push(`/system/conversations?id=${encodeURIComponent(id)}`);
    },
    [router],
  );

  // Skip rendering while signed out — the bell is admin-only.
  if (!currentUserId) return null;

  const dropdownContent = (
    <div
      style={{
        width: 360,
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text strong>Conversations</Text>
        <Button type="link" size="small" onClick={() => goToInbox()}>
          View all
        </Button>
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {loading && preview.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: token.colorTextSecondary,
            }}
          >
            Loading…
          </div>
        ) : preview.length === 0 ? (
          <Empty
            style={{ padding: 24 }}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                No conversations yet.
              </Text>
            }
          />
        ) : (
          preview.map((conv, idx) => {
            const isBroadcast = conv.kind === "BROADCAST";
            const peer = !isBroadcast
              ? conv.participants.find((p) => p.adminId !== currentUserId)
                  ?.admin
              : null;
            const title = isBroadcast
              ? conv.title || "Broadcast"
              : peer?.fullName || peer?.username || "Direct message";

            return (
              <div
                key={conv.id}
                onClick={() => goToConversation(conv.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom:
                    idx === preview.length - 1
                      ? "none"
                      : `1px solid ${token.colorBorderSecondary}`,
                  transition: "background-color 120ms ease",
                  backgroundColor:
                    conv.unreadCount > 0
                      ? token.colorPrimaryBg
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    token.colorFillTertiary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    conv.unreadCount > 0
                      ? token.colorPrimaryBg
                      : "transparent";
                }}
              >
                <Badge count={conv.unreadCount} size="small">
                  {isBroadcast ? (
                    <Avatar
                      size="small"
                      style={{ backgroundColor: token.colorWarning }}
                      icon={<NotificationOutlined />}
                    />
                  ) : (
                    <Avatar
                      size="small"
                      src={peer?.profileImage || undefined}
                      style={{ backgroundColor: token.colorPrimary }}
                    >
                      {title[0]?.toUpperCase() || "?"}
                    </Avatar>
                  )}
                </Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontWeight: conv.unreadCount > 0 ? 600 : 500,
                        color: token.colorText,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 200,
                        fontSize: 13,
                      }}
                    >
                      {title}
                    </span>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11, whiteSpace: "nowrap" }}
                    >
                      {conv.lastMessageAt
                        ? dayjs(conv.lastMessageAt).fromNow(true)
                        : ""}
                    </Text>
                  </div>
                  <div className="flex items-center gap-1" style={{ marginTop: 2 }}>
                    <Tag
                      color={KIND_COLOR[conv.kind]}
                      style={{ marginRight: 0, fontSize: 10 }}
                    >
                      {KIND_LABEL[conv.kind]}
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
                      {conv.lastMessage?.content || "No messages yet"}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
      trigger={["click"]}
      arrow
      popupRender={() => dropdownContent}
    >
      <Badge count={totalUnread} size="small">
        <Button
          type="text"
          icon={<MessageOutlined style={{ fontSize: 14 }} />}
          style={{ border: "none" }}
          aria-label="Conversations"
        />
      </Badge>
    </Dropdown>
  );
};

export default ConversationBell;
