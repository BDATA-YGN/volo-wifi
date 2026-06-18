"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App } from "antd";

import { emitConversationReadSync } from "./constant";
import {
  addParticipants as addParticipantsApi,
  deleteConversation,
  getCandidates,
  getConversation,
  getInbox,
  getMessages,
  getRecipients,
  markRead,
  removeParticipant as removeParticipantApi,
  sendMessage as sendMessageApi,
  startBroadcast,
  startDirect,
} from "./query";
import type {
  AddParticipantsPayload,
  AdminSlim,
  ConversationRecord,
  InboxFilter,
  MessageRecord,
  SendMessagePayload,
  StartBroadcastPayload,
  StartDirectPayload,
} from "./interface";

/**
 * Local cache of message lists keyed by conversation id so switching threads
 * is instant after first load. Append-only — new sockets pushes are merged in
 * via `mergeMessage`.
 */
export const useConversations = (currentUserId: string | undefined) => {
  const { message: antdMessage } = App.useApp();

  const [inboxFilter, setInboxFilter] = useState<InboxFilter>({ kind: "ALL" });
  const [inbox, setInbox] = useState<ConversationRecord[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<ConversationRecord | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);

  const [messagesById, setMessagesById] = useState<
    Record<string, MessageRecord[]>
  >({});
  const [messagesLoadingById, setMessagesLoadingById] = useState<
    Record<string, boolean>
  >({});

  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<AdminSlim[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [candidates, setCandidates] = useState<AdminSlim[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [participantBusy, setParticipantBusy] = useState(false);

  // Track first-load to keep "load more" idempotent.
  const loadedThreadsRef = useRef<Set<string>>(new Set());

  // ────────────────────────────────────────────────────────────
  // Inbox
  // ────────────────────────────────────────────────────────────
  const refreshInbox = useCallback(
    async (next: InboxFilter = inboxFilter) => {
      setInboxLoading(true);
      try {
        const res = await getInbox(next);
        setInbox((res.data as ConversationRecord[]) ?? []);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to load conversations");
      } finally {
        setInboxLoading(false);
      }
    },
    [inboxFilter, antdMessage],
  );

  useEffect(() => {
    void refreshInbox(inboxFilter);
  }, [inboxFilter, refreshInbox]);

  // ────────────────────────────────────────────────────────────
  // Recipients (for "New DM")
  // ────────────────────────────────────────────────────────────
  const refreshRecipients = useCallback(
    async (search?: string) => {
      setRecipientsLoading(true);
      try {
        const res = await getRecipients(search);
        setRecipients((res.data as AdminSlim[]) ?? []);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to load recipients");
      } finally {
        setRecipientsLoading(false);
      }
    },
    [antdMessage],
  );

  // ────────────────────────────────────────────────────────────
  // Active conversation + history
  // ────────────────────────────────────────────────────────────
  const loadMessages = useCallback(
    async (id: string, before?: string) => {
      setMessagesLoadingById((prev) => ({ ...prev, [id]: true }));
      try {
        const res = await getMessages(id, before);
        const list = (res.data as MessageRecord[]) ?? [];
        setMessagesById((prev) => {
          const existing = prev[id] ?? [];
          // Prepend older history when paginating; otherwise initial load
          // already returns ascending order from the API.
          const next = before ? [...list, ...existing] : list;
          return { ...prev, [id]: dedupeMessages(next) };
        });
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to load messages");
      } finally {
        setMessagesLoadingById((prev) => ({ ...prev, [id]: false }));
      }
    },
    [antdMessage],
  );

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setActiveLoading(true);
      try {
        const res = await getConversation(id);
        setActiveConversation(res.data as ConversationRecord);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to open conversation");
      } finally {
        setActiveLoading(false);
      }

      if (!loadedThreadsRef.current.has(id)) {
        loadedThreadsRef.current.add(id);
        await loadMessages(id);
      }

      // Best-effort: stamp the inbox row so the badge clears immediately.
      try {
        await markRead(id);
        emitConversationReadSync(id);
      } catch (err: any) {
        // Non-blocking — the next inbox refresh will reconcile.
      }
      setInbox((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, unreadCount: 0, lastReadAt: new Date().toISOString() }
            : c,
        ),
      );
    },
    [antdMessage, loadMessages],
  );

  // ────────────────────────────────────────────────────────────
  // Composing
  // ────────────────────────────────────────────────────────────
  const handleStartDirect = useCallback(
    async (payload: StartDirectPayload) => {
      try {
        const res = await startDirect(payload);
        const data = res.data as {
          conversation: ConversationRecord;
          firstMessage: MessageRecord | null;
        };
        const conv = data.conversation;
        // Insert / move-to-top in inbox.
        setInbox((prev) => upsertInbox(prev, conv));
        if (data.firstMessage) {
          setMessagesById((prev) => ({
            ...prev,
            [conv.id]: dedupeMessages([
              ...(prev[conv.id] ?? []),
              data.firstMessage as MessageRecord,
            ]),
          }));
          loadedThreadsRef.current.add(conv.id);
        }
        await openConversation(conv.id);
        return conv;
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to start conversation");
        throw err;
      }
    },
    [antdMessage, openConversation],
  );

  const handleStartBroadcast = useCallback(
    async (payload: StartBroadcastPayload) => {
      try {
        const res = await startBroadcast(payload);
        const data = res.data as {
          conversation: ConversationRecord;
          firstMessage: MessageRecord;
        };
        setInbox((prev) => upsertInbox(prev, data.conversation));
        setMessagesById((prev) => ({
          ...prev,
          [data.conversation.id]: dedupeMessages([
            ...(prev[data.conversation.id] ?? []),
            data.firstMessage,
          ]),
        }));
        loadedThreadsRef.current.add(data.conversation.id);
        await openConversation(data.conversation.id);
        antdMessage.success("Broadcast sent");
        return data.conversation;
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to send broadcast");
        throw err;
      }
    },
    [antdMessage, openConversation],
  );

  const handleSendMessage = useCallback(
    async (id: string, payload: SendMessagePayload) => {
      setSending(true);
      try {
        const res = await sendMessageApi(id, payload);
        const msg = res.data as MessageRecord;
        // Optimistic merge — the socket fan-out will likely arrive milliseconds
        // later but we de-dupe on id so it's safe.
        setMessagesById((prev) => ({
          ...prev,
          [id]: dedupeMessages([...(prev[id] ?? []), msg]),
        }));
        setInbox((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  lastMessage: msg,
                  lastMessageAt: msg.createdAt,
                  unreadCount: 0,
                }
              : c,
          ),
        );
        return msg;
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to send message");
        throw err;
      } finally {
        setSending(false);
      }
    },
    [antdMessage],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setInbox((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) {
          setActiveId(null);
          setActiveConversation(null);
        }
        antdMessage.success("Conversation deleted");
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to delete conversation");
      }
    },
    [activeId, antdMessage],
  );

  // ────────────────────────────────────────────────────────────
  // Participant management (owner-only, BROADCAST/GROUP)
  // ────────────────────────────────────────────────────────────
  const refreshCandidates = useCallback(
    async (search?: string) => {
      if (!activeId) {
        setCandidates([]);
        return;
      }
      setCandidatesLoading(true);
      try {
        const res = await getCandidates(activeId, search);
        setCandidates((res.data as AdminSlim[]) ?? []);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to load candidates");
      } finally {
        setCandidatesLoading(false);
      }
    },
    [activeId, antdMessage],
  );

  const reloadActiveConversation = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await getConversation(activeId);
      setActiveConversation(res.data as ConversationRecord);
    } catch (err: any) {
      antdMessage.error(err?.message || "Failed to refresh participants");
    }
  }, [activeId, antdMessage]);

  const handleAddParticipants = useCallback(
    async (payload: AddParticipantsPayload) => {
      if (!activeId || payload.adminIds.length === 0) return;
      setParticipantBusy(true);
      try {
        const res = await addParticipantsApi(activeId, payload);
        antdMessage.success(res.message || "Participants added");
        await Promise.all([reloadActiveConversation(), refreshCandidates()]);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to add participants");
      } finally {
        setParticipantBusy(false);
      }
    },
    [activeId, antdMessage, refreshCandidates, reloadActiveConversation],
  );

  const handleRemoveParticipant = useCallback(
    async (adminId: string) => {
      if (!activeId) return;
      setParticipantBusy(true);
      try {
        await removeParticipantApi(activeId, adminId);
        antdMessage.success("Participant removed");
        await Promise.all([reloadActiveConversation(), refreshCandidates()]);
      } catch (err: any) {
        antdMessage.error(err?.message || "Failed to remove participant");
      } finally {
        setParticipantBusy(false);
      }
    },
    [activeId, antdMessage, refreshCandidates, reloadActiveConversation],
  );

  // ────────────────────────────────────────────────────────────
  // Realtime merge points (called from <ConversationsPage /> socket hooks).
  // ────────────────────────────────────────────────────────────
  const mergeIncomingMessage = useCallback(
    (conversationId: string, msg: MessageRecord) => {
      setMessagesById((prev) => ({
        ...prev,
        [conversationId]: dedupeMessages([
          ...(prev[conversationId] ?? []),
          msg,
        ]),
      }));
      setInbox((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx < 0) return prev;
        const target = prev[idx];
        const isActiveThread = activeId === conversationId;
        const isFromMe = msg.senderId === currentUserId;
        const next = [...prev];
        next.splice(idx, 1);
        next.unshift({
          ...target,
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          unreadCount:
            isActiveThread || isFromMe ? 0 : (target.unreadCount || 0) + 1,
        });
        return next;
      });
      // Auto-mark-read when the thread is open.
      if (activeId === conversationId && msg.senderId !== currentUserId) {
        void markRead(conversationId)
          .then(() => emitConversationReadSync(conversationId))
          .catch(() => undefined);
      }
    },
    [activeId, currentUserId],
  );

  const upsertConversationFromSocket = useCallback(
    async (conversationId: string, deleted = false) => {
      if (deleted) {
        setInbox((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeId === conversationId) {
          setActiveId(null);
          setActiveConversation(null);
        }
        return;
      }
      try {
        const res = await getConversation(conversationId);
        const conv = res.data as ConversationRecord;
        setInbox((prev) => upsertInbox(prev, conv));
        // Keep the open thread's participant list in sync when the upsert
        // targets it (typical trigger: another tab added / removed members).
        if (activeId === conversationId) {
          setActiveConversation(conv);
        }
      } catch {
        // Fall back to a full inbox refresh if the targeted fetch failed.
        void refreshInbox(inboxFilter);
      }
    },
    [activeId, inboxFilter, refreshInbox],
  );

  const messagesForActive = useMemo(
    () => (activeId ? (messagesById[activeId] ?? []) : []),
    [activeId, messagesById],
  );

  return {
    // inbox
    inbox,
    inboxLoading,
    inboxFilter,
    setInboxFilter,
    refreshInbox,
    // active
    activeId,
    activeConversation,
    activeLoading,
    openConversation,
    closeConversation: () => {
      setActiveId(null);
      setActiveConversation(null);
    },
    // messages
    messagesForActive,
    messagesLoading: activeId ? !!messagesLoadingById[activeId] : false,
    loadMoreMessages: () => {
      if (!activeId) return;
      const list = messagesById[activeId] ?? [];
      const oldest = list[0]?.createdAt;
      if (oldest) void loadMessages(activeId, oldest);
    },
    // composing
    sending,
    sendMessage: handleSendMessage,
    startDirect: handleStartDirect,
    startBroadcast: handleStartBroadcast,
    removeConversation: handleDelete,
    // recipients
    recipients,
    recipientsLoading,
    refreshRecipients,
    // participants (owner-only)
    candidates,
    candidatesLoading,
    refreshCandidates,
    addParticipants: handleAddParticipants,
    removeParticipant: handleRemoveParticipant,
    participantBusy,
    // realtime
    mergeIncomingMessage,
    upsertConversationFromSocket,
  };
};

/** Append-or-replace + de-dupe helper for message buffers. */
function dedupeMessages(list: MessageRecord[]): MessageRecord[] {
  const seen = new Map<string, MessageRecord>();
  for (const m of list) seen.set(m.id, m);
  return Array.from(seen.values()).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Insert at top (most recent) or replace existing. */
function upsertInbox(
  prev: ConversationRecord[],
  incoming: ConversationRecord,
): ConversationRecord[] {
  const filtered = prev.filter((c) => c.id !== incoming.id);
  return [incoming, ...filtered];
}
