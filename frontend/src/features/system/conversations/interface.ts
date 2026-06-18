import type { ConversationKind } from "./constant";

export interface AdminSlim {
  id: string;
  fullName: string;
  username?: string | null;
  email?: string | null;
  profileImage?: string | null;
  isOnline?: boolean | null;
  role?: { roleName: string } | null;
}

export interface ParticipantRecord {
  id: string;
  adminId: string;
  joinedAt: string;
  lastReadAt: string | null;
  isMuted: boolean;
  isOwner: boolean;
  admin: AdminSlim;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  editedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  sender: AdminSlim;
}

export interface ConversationRecord {
  id: string;
  kind: ConversationKind;
  title: string | null;
  createdById: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
  participants: ParticipantRecord[];
  /** Convenience field added by the inbox endpoint. */
  myParticipantId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: MessageRecord | null;
  createdBy?: AdminSlim;
}

export interface InboxFilter {
  kind?: ConversationKind | "ALL";
  search?: string;
  limit?: number;
}

export interface StartDirectPayload {
  recipientId: string;
  message?: string;
}

export interface StartBroadcastPayload {
  title?: string;
  message: string;
}

export interface SendMessagePayload {
  content: string;
  attachmentUrl?: string;
}

export interface AddParticipantsPayload {
  adminIds: string[];
}

/* ───────── Socket payloads (mirror backend emitter shapes). ───────── */
export interface NewMessageEvent {
  conversationId: string;
  message: MessageRecord;
}

export interface ConversationUpsertEvent {
  conversationId: string;
  deleted?: boolean;
}

export interface ConversationReadEvent {
  conversationId: string;
  lastReadAt: string;
}
