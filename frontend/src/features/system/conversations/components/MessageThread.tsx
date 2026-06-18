"use client";

import React, { useEffect, useRef } from "react";
import {
  Avatar,
  Button,
  Empty,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  DeleteOutlined,
  NotificationOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { KIND_COLOR, KIND_LABEL } from "../constant";
import type { ConversationRecord, MessageRecord } from "../interface";

const { Text } = Typography;

interface Props {
  currentUserId: string | undefined;
  conversation: ConversationRecord | null;
  messages: MessageRecord[];
  loading: boolean;
  onLoadMore: () => void;
  onDelete?: () => void;
  onManageParticipants?: () => void;
}

const MessageThread: React.FC<Props> = ({
  currentUserId,
  conversation,
  messages,
  loading,
  onLoadMore,
  onDelete,
  onManageParticipants,
}) => {
  const { token } = theme.useToken();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageCountRef = useRef(0);

  useEffect(() => {
    // Auto-scroll to bottom when new messages append (not when paginating).
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > messageCountRef.current;
    messageCountRef.current = messages.length;
    if (grew) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  if (!conversation) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: token.colorBgLayout,
        }}
      >
        <Empty
          description={
            <div>
              <Text style={{ color: token.colorTextSecondary }}>
                Select a conversation to start messaging
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  const isBroadcast = conversation.kind === "BROADCAST";
  const peer = !isBroadcast
    ? conversation.participants.find((p) => p.adminId !== currentUserId)?.admin
    : null;

  const headerTitle = isBroadcast
    ? conversation.title || "Broadcast"
    : peer?.fullName || peer?.username || "Direct message";

  const canDelete = conversation.createdById === currentUserId;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: token.colorBgLayout,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-3">
          {isBroadcast ? (
            <Avatar
              style={{ backgroundColor: token.colorWarning }}
              icon={<NotificationOutlined />}
            />
          ) : (
            <Avatar
              src={peer?.profileImage || undefined}
              style={{ backgroundColor: token.colorPrimary }}
            >
              {peer?.fullName?.[0]?.toUpperCase() || "?"}
            </Avatar>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Text strong style={{ fontSize: 16 }}>
                {headerTitle}
              </Text>
              <Tag color={KIND_COLOR[conversation.kind]}>
                {KIND_LABEL[conversation.kind]}
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {isBroadcast ? (
                <>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  {conversation.participants.length} participant
                  {conversation.participants.length === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  {peer?.isOnline ? (
                    <Tag color="green" style={{ marginRight: 0 }}>
                      Online
                    </Tag>
                  ) : (
                    <Tag style={{ marginRight: 0 }}>Offline</Tag>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onManageParticipants && (
            <Tooltip title="Manage participants">
              <Button
                size="small"
                icon={<UsergroupAddOutlined />}
                onClick={onManageParticipants}
              >
                Participants
              </Button>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete conversation">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length > 0 && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <Button size="small" type="link" onClick={onLoadMore}>
              Load earlier messages
            </Button>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : messages.length === 0 ? (
          <Empty
            description={
              <Text style={{ color: token.colorTextSecondary }}>
                No messages yet. Be the first to write.
              </Text>
            }
          />
        ) : (
          messages.map((msg, idx) => {
            const mine = msg.senderId === currentUserId;
            const prev = messages[idx - 1];
            const showAuthor =
              !mine && (!prev || prev.senderId !== msg.senderId);
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                mine={mine}
                showAuthor={showAuthor}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

interface BubbleProps {
  msg: MessageRecord;
  mine: boolean;
  showAuthor: boolean;
}

const MessageBubble: React.FC<BubbleProps> = ({ msg, mine, showAuthor }) => {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: mine ? "row-reverse" : "row",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {!mine && (
        <Avatar
          size="small"
          src={msg.sender?.profileImage || undefined}
          style={{ backgroundColor: token.colorPrimary }}
        >
          {msg.sender?.fullName?.[0]?.toUpperCase() || "?"}
        </Avatar>
      )}
      <div style={{ maxWidth: "70%" }}>
        {showAuthor && (
          <div
            style={{
              fontSize: 11,
              color: token.colorTextSecondary,
              marginBottom: 2,
              paddingLeft: 4,
            }}
          >
            {msg.sender?.fullName || msg.sender?.username || "Unknown"}
          </div>
        )}
        <div
          style={{
            background: mine ? token.colorPrimary : token.colorBgContainer,
            color: mine ? token.colorTextLightSolid : token.colorText,
            padding: "8px 12px",
            borderRadius: 12,
            border: mine
              ? "none"
              : `1px solid ${token.colorBorderSecondary}`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.content}
        </div>
        <div
          style={{
            fontSize: 10,
            color: token.colorTextTertiary,
            marginTop: 2,
            textAlign: mine ? "right" : "left",
          }}
        >
          {dayjs(msg.createdAt).format("HH:mm")}
          {msg.editedAt && " · edited"}
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
