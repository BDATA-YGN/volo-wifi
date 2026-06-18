"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { App, Card, theme } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useSearchParams } from "next/navigation";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useIsMobile } from "@/common/hooks/useBreakpoint";
import { useAuthStore } from "@/features/core/auth/store";
import { useSocketEvent } from "@/lib/socket/SocketProvider";

import ConversationList from "./components/ConversationList";
import MessageComposer from "./components/MessageComposer";
import MessageThread from "./components/MessageThread";
import NewBroadcastDialog from "./components/NewBroadcastDialog";
import NewDirectDialog from "./components/NewDirectDialog";
import ParticipantsDrawer from "./components/ParticipantsDrawer";
import { CONVERSATION_SOCKET_EVENTS } from "./constant";
import type {
  AdminSlim,
  ConversationReadEvent,
  ConversationUpsertEvent,
  NewMessageEvent,
  StartBroadcastPayload,
} from "./interface";
import { useConversations } from "./useConversations";

const ConversationsPage: React.FC = () => {
  const { token } = theme.useToken();
  const isMobile = useIsMobile();
  const { modal } = App.useApp();
  const { authData } = useAuthStore();
  const currentUserId = authData?.id;

  const {
    inbox,
    inboxLoading,
    inboxFilter,
    setInboxFilter,
    refreshInbox,
    activeId,
    activeConversation,
    activeLoading,
    openConversation,
    messagesForActive,
    messagesLoading,
    loadMoreMessages,
    sending,
    sendMessage,
    startDirect,
    startBroadcast,
    removeConversation,
    recipients,
    recipientsLoading,
    refreshRecipients,
    candidates,
    candidatesLoading,
    refreshCandidates,
    addParticipants,
    removeParticipant,
    participantBusy,
    mergeIncomingMessage,
    upsertConversationFromSocket,
  } = useConversations(currentUserId);

  const [directOpen, setDirectOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  // Deep-link support: `/system/conversations?id=<convId>` (used by the
  // top-bar conversation bell). Auto-open once per id so a back/forward
  // doesn't fight with manual selection.
  const searchParams = useSearchParams();
  const requestedId = searchParams?.get("id") || null;
  const lastOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedId) return;
    if (lastOpenedRef.current === requestedId) return;
    lastOpenedRef.current = requestedId;
    void openConversation(requestedId);
  }, [requestedId, openConversation]);

  // ────────────── Real-time wiring ──────────────
  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.NEW_MESSAGE,
    (payload: NewMessageEvent) => {
      if (!payload?.conversationId || !payload.message) return;
      mergeIncomingMessage(payload.conversationId, payload.message);
    },
    [mergeIncomingMessage],
  );

  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.UPSERT,
    (payload: ConversationUpsertEvent) => {
      if (!payload?.conversationId) return;
      void upsertConversationFromSocket(payload.conversationId, payload.deleted);
    },
    [upsertConversationFromSocket],
  );

  useSocketEvent(
    CONVERSATION_SOCKET_EVENTS.READ,
    (_payload: ConversationReadEvent) => {
      // Other tabs of the same admin marked a thread read — refresh badges.
      void refreshInbox();
    },
    [refreshInbox],
  );

  // ────────────── Action handlers ──────────────
  const handleSelectRecipient = useCallback(
    async (admin: AdminSlim) => {
      await startDirect({ recipientId: admin.id });
      setDirectOpen(false);
    },
    [startDirect],
  );

  const handleStartBroadcast = useCallback(
    async (payload: StartBroadcastPayload) => {
      await startBroadcast(payload);
    },
    [startBroadcast],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeId) return;
      await sendMessage(activeId, { content });
    },
    [activeId, sendMessage],
  );

  const handleDelete = useCallback(() => {
    if (!activeId) return;
    modal.confirm({
      title: "Delete conversation?",
      icon: <ExclamationCircleOutlined />,
      content:
        "This will hide the conversation for every participant. The history is kept for audit but no further messages can be sent.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => removeConversation(activeId),
    });
  }, [activeId, modal, removeConversation]);

  return (
    <div className="p-0">
      <CommonHeader />
      <div
        style={{
          height: "var(--content-body-height)",
          background: token.colorBgLayout,
          padding: 16,
        }}
      >
        <Card
          variant="borderless"
          styles={{
            body: {
              padding: 0,
              height: "100%",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(240px, 320px) 1fr",
              minHeight: 0,
              overflow: "hidden",
              borderRadius: token.borderRadiusLG,
            },
          }}
          style={{
            height: "100%",
            borderRadius: token.borderRadiusLG,
            overflow: "hidden",
          }}
        >
          <ConversationList
            currentUserId={currentUserId}
            conversations={inbox}
            loading={inboxLoading}
            filter={inboxFilter}
            onFilterChange={setInboxFilter}
            activeId={activeId}
            onSelect={openConversation}
            onNewDirect={() => {
              setDirectOpen(true);
              void refreshRecipients();
            }}
            onNewBroadcast={() => setBroadcastOpen(true)}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <div style={{ flex: 1, minHeight: 0 }}>
              <MessageThread
                currentUserId={currentUserId}
                conversation={activeConversation}
                messages={messagesForActive}
                loading={activeLoading || messagesLoading}
                onLoadMore={loadMoreMessages}
                onDelete={
                  activeConversation?.createdById === currentUserId
                    ? handleDelete
                    : undefined
                }
                onManageParticipants={
                  activeConversation &&
                  activeConversation.kind !== "DIRECT" &&
                  activeConversation.createdById === currentUserId
                    ? () => setParticipantsOpen(true)
                    : undefined
                }
              />
            </div>
            <MessageComposer
              disabled={!activeId}
              sending={sending}
              onSend={handleSendMessage}
            />
          </div>
        </Card>
      </div>

      <NewDirectDialog
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        recipients={recipients}
        loading={recipientsLoading}
        onSearch={refreshRecipients}
        onSelect={handleSelectRecipient}
      />
      <NewBroadcastDialog
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        onSubmit={async (payload) => {
          await handleStartBroadcast(payload);
        }}
      />
      <ParticipantsDrawer
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        conversation={activeConversation}
        currentUserId={currentUserId}
        candidates={candidates}
        candidatesLoading={candidatesLoading}
        participantBusy={participantBusy}
        onSearchCandidates={refreshCandidates}
        onAddParticipants={async (ids) => {
          await addParticipants({ adminIds: ids });
        }}
        onRemoveParticipant={async (id) => {
          await removeParticipant(id);
        }}
      />
    </div>
  );
};

export default ConversationsPage;
