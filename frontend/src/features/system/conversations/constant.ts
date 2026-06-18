/**
 * Conversation API surface + UI constants. Keep mappings here so the rest of
 * the feature stays declarative and is trivial to refactor when routes move.
 */
export const CONVERSATION_ROUTES = {
  inbox: () => `/conversations`,
  recipients: () => `/conversations/recipients`,
  details: (id: string) => `/conversations/${encodeURIComponent(id)}`,
  messages: (id: string) => `/conversations/${encodeURIComponent(id)}/messages`,
  candidates: (id: string) =>
    `/conversations/${encodeURIComponent(id)}/candidates`,
  startDirect: () => `/conversations/direct`,
  startBroadcast: () => `/conversations/broadcast`,
  sendMessage: (id: string) =>
    `/conversations/${encodeURIComponent(id)}/messages`,
  markRead: (id: string) => `/conversations/${encodeURIComponent(id)}/read`,
  addParticipants: (id: string) =>
    `/conversations/${encodeURIComponent(id)}/participants`,
  removeParticipant: (id: string, adminId: string) =>
    `/conversations/${encodeURIComponent(id)}/participants/${encodeURIComponent(adminId)}`,
  remove: (id: string) => `/conversations/delete/${encodeURIComponent(id)}`,
};

/** Mirrors backend `SOCKET_EVENT` map in `conversations/controller.ts`. */
export const CONVERSATION_SOCKET_EVENTS = {
  NEW_MESSAGE: "CONVERSATION_NEW_MESSAGE",
  UPSERT: "CONVERSATION_UPSERT",
  READ: "CONVERSATION_READ",
} as const;

/**
 * Dispatched on `window` after a successful `markRead` API call so the
 * header conversation bell can resync immediately (same tab, no socket
 * round-trip). Detail: `{ conversationId: string }`.
 */
export const HR_CONVERSATION_READ_DOM_EVENT = "hr:conversation-read-sync" as const;

export function emitConversationReadSync(conversationId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HR_CONVERSATION_READ_DOM_EVENT, {
      detail: { conversationId },
    }),
  );
}

export const CONVERSATION_KINDS = ["DIRECT", "GROUP", "BROADCAST"] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export const KIND_LABEL: Record<ConversationKind, string> = {
  DIRECT: "Direct",
  GROUP: "Group",
  BROADCAST: "Broadcast",
};

export const KIND_COLOR: Record<ConversationKind, string> = {
  DIRECT: "blue",
  GROUP: "purple",
  BROADCAST: "magenta",
};

export const MESSAGE_MAX_LENGTH = 4000;
export const BROADCAST_TITLE_MAX_LENGTH = 120;

/** Page size for message history pagination. */
export const MESSAGE_PAGE_SIZE = 50;
