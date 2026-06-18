"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  App,
  Avatar,
  Button,
  Drawer,
  Empty,
  Input,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import type {
  AdminSlim,
  ConversationRecord,
  ParticipantRecord,
} from "../interface";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ConversationRecord | null;
  currentUserId: string | undefined;
  candidates: AdminSlim[];
  candidatesLoading: boolean;
  participantBusy: boolean;
  onSearchCandidates: (query: string) => void;
  onAddParticipants: (adminIds: string[]) => Promise<void>;
  onRemoveParticipant: (adminId: string) => Promise<void>;
}

/**
 * Owner-only drawer for BROADCAST / GROUP conversations. Splits into two
 * sections: the current participant roster (with remove buttons) and a
 * picker for adding new members (with debounced search).
 */
const ParticipantsDrawer: React.FC<Props> = ({
  open,
  onClose,
  conversation,
  currentUserId,
  candidates,
  candidatesLoading,
  participantBusy,
  onSearchCandidates,
  onAddParticipants,
  onRemoveParticipant,
}) => {
  const { token } = theme.useToken();
  const { modal } = App.useApp();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected([]);
      return;
    }
    onSearchCandidates("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => onSearchCandidates(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search, open, onSearchCandidates]);

  const participants = useMemo<ParticipantRecord[]>(
    () => conversation?.participants ?? [],
    [conversation],
  );

  const handleAdd = async () => {
    if (selected.length === 0) return;
    await onAddParticipants(selected);
    setSelected([]);
  };

  const askRemove = (p: ParticipantRecord) => {
    modal.confirm({
      title: "Remove participant?",
      content: `${p.admin.fullName || p.admin.username} will no longer see this conversation.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: () => onRemoveParticipant(p.adminId),
    });
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          Manage participants
        </span>
      }
      placement="right"
      styles={{ wrapper: { width: 480 }, body: { padding: 0 } }}
      destroyOnHidden
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Current roster */}
        <div style={{ padding: 16 }}>
          <Text strong>
            Current participants ({participants.length})
          </Text>
          <div
            style={{
              marginTop: 12,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {participants.length === 0 ? (
              <Empty style={{ padding: 24 }} description="No one yet" />
            ) : (
              participants.map((p, idx) => {
                const isOwner = p.isOwner;
                const isSelf = p.adminId === currentUserId;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderBottom:
                        idx === participants.length - 1
                          ? "none"
                          : `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <Avatar
                      src={p.admin.profileImage || undefined}
                      style={{
                        flexShrink: 0,
                        backgroundColor: token.colorPrimary,
                      }}
                    >
                      {p.admin.fullName?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <Text strong>{p.admin.fullName}</Text>
                        {isOwner && (
                          <Tag color="gold" style={{ marginRight: 0 }}>
                            Owner
                          </Tag>
                        )}
                        {isSelf && !isOwner && (
                          <Tag style={{ marginRight: 0 }}>You</Tag>
                        )}
                        {p.admin.isOnline && (
                          <Tag color="green" style={{ marginRight: 0 }}>
                            Online
                          </Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {p.admin.username}
                        {p.admin.email ? ` · ${p.admin.email}` : ""}
                      </Text>
                    </div>
                    {isOwner ? (
                      <Tooltip title="Owner cannot be removed">
                        <span>
                          <Button size="small" type="text" disabled icon={<DeleteOutlined />} />
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Remove from conversation">
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          loading={participantBusy}
                          onClick={() => askRemove(p)}
                        />
                      </Tooltip>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: token.colorBorderSecondary,
            margin: "0 16px",
          }}
        />

        {/* Add new participants */}
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Text strong>Add participants</Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selected.length === 0}
              loading={participantBusy}
              onClick={() => void handleAdd()}
            >
              Add ({selected.length})
            </Button>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              minHeight: 120,
            }}
          >
            {candidatesLoading ? (
              <div style={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            ) : candidates.length === 0 ? (
              <Empty
                style={{ padding: 24 }}
                description="Everyone is already in this conversation."
              />
            ) : (
              candidates.map((admin, idx) => {
                const isSelected = selected.includes(admin.id);
                return (
                  <div
                    key={admin.id}
                    onClick={() => toggleSelected(admin.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? token.colorPrimaryBg
                        : "transparent",
                      borderBottom:
                        idx === candidates.length - 1
                          ? "none"
                          : `1px solid ${token.colorBorderSecondary}`,
                      transition: "background-color 120ms ease",
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
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {admin.username}
                        {admin.email ? ` · ${admin.email}` : ""}
                      </Text>
                    </div>
                    {isSelected && (
                      <Tag color={token.colorPrimary} style={{ marginRight: 0 }}>
                        Selected
                      </Tag>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default ParticipantsDrawer;
