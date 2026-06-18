import { Request, Response } from 'express';
import Container from 'typedi';

import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import type {
  Conversation,
  ConversationKind,
  PrismaClient,
} from '@/generated/prisma/client';
import { WebSocketService } from '@/third-party/bdataSocket';
import { logger } from '@/logging/logger';

import {
  AddParticipantsSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  SendMessageSchema,
  StartBroadcastSchema,
  StartDirectSchema,
} from './schema';

/**
 * Socket events emitted to the client. Mirror these in
 * `frontend/.../conversations/constant.ts` `SOCKET_EVENTS`.
 */
const SOCKET_EVENT = {
  NEW_MESSAGE: 'CONVERSATION_NEW_MESSAGE',
  CONVERSATION_UPSERT: 'CONVERSATION_UPSERT',
  CONVERSATION_READ: 'CONVERSATION_READ',
} as const;

/**
 * Conversations REST controller — HR / System domain.
 *
 *   GET    /conversations                          inbox for the current admin
 *   GET    /conversations/recipients               admins available to DM
 *   GET    /conversations/:id                      detail + participants
 *   GET    /conversations/:id/messages?before=...  message history (newest first)
 *   GET    /conversations/:id/candidates           addable admins (owner-only)
 *   POST   /conversations/direct                   open / start DM with one admin
 *   POST   /conversations/broadcast                broadcast a message to all
 *   POST   /conversations/:id/messages             send into existing thread
 *   POST   /conversations/:id/participants         add admins (owner-only)
 *   POST   /conversations/:id/read                 mark caller's lastReadAt
 *   DELETE /conversations/:id/participants/:adminId remove an admin (owner-only)
 *   DELETE /conversations/:id                      soft-delete (creator only)
 *
 * Participants drive read state — for BROADCAST we materialise one
 * `ConversationParticipant` row per active admin at send time, which lets us
 * compute unread counts uniformly across DIRECT / BROADCAST and survive new
 * admins being onboarded later.
 */
export class ConversationController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  private get socket(): WebSocketService {
    return Container.get(WebSocketService);
  }

  /** Resolve current admin from the auth middleware. */
  private requireAdminId(req: Request, res: Response): string | null {
    const id = req.user?.id || req.userId;
    if (!id) {
      responseError(res, 401, { code: '401', message: 'Not authenticated' });
      return null;
    }
    return String(id);
  }

  // ────────────────────────────────────────────────────────────────────────
  // List / details
  // ────────────────────────────────────────────────────────────────────────

  public listInbox = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;

      const { value, error } = ListConversationsQuerySchema.validate(req.query, {
        stripUnknown: true,
      });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }

      const where: any = {
        deletedAt: null,
        participants: { some: { adminId } },
      };
      if (value.kind && value.kind !== 'ALL') where.kind = value.kind;
      if (value.search) {
        where.OR = [
          { title: { contains: value.search, mode: 'insensitive' } },
          { messages: { some: { content: { contains: value.search, mode: 'insensitive' } } } },
        ];
      }

      const rows = await this.prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take: value.limit,
        include: {
          participants: {
            include: {
              admin: { select: { id: true, fullName: true, username: true, profileImage: true, isOnline: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { id: true, fullName: true } } },
          },
        },
      });

      const data = await Promise.all(
        rows.map(async (conv) => {
          const me = conv.participants.find((p) => p.adminId === adminId);
          const unreadCount = me?.lastReadAt
            ? await this.prisma.message.count({
                where: {
                  conversationId: conv.id,
                  createdAt: { gt: me.lastReadAt },
                  senderId: { not: adminId },
                  deletedAt: null,
                },
              })
            : await this.prisma.message.count({
                where: { conversationId: conv.id, senderId: { not: adminId }, deletedAt: null },
              });
          return {
            ...conv,
            myParticipantId: me?.id ?? null,
            lastReadAt: me?.lastReadAt ?? null,
            unreadCount,
            lastMessage: conv.messages[0] ?? null,
            messages: undefined,
          };
        }),
      );

      responseSuccess(res, { message: 'Success', data });
    }),
  ];

  public getDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const conv = await this.prisma.conversation.findFirst({
        where: { id, deletedAt: null, participants: { some: { adminId } } },
        include: {
          participants: {
            include: {
              admin: { select: { id: true, fullName: true, username: true, profileImage: true, isOnline: true } },
            },
          },
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      if (!conv) {
        return responseError(res, 404, { code: '404', message: 'Conversation not found' });
      }

      responseSuccess(res, { message: 'Success', data: conv });
    }),
  ];

  public listMessages = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const isMember = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId: id, adminId },
        select: { id: true },
      });
      if (!isMember) {
        return responseError(res, 403, { code: '403', message: 'Not a participant' });
      }

      const { value, error } = ListMessagesQuerySchema.validate(req.query, { stripUnknown: true });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }

      const where: any = { conversationId: id, deletedAt: null };
      if (value.before) where.createdAt = { lt: new Date(value.before) };

      const rows = await this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: value.limit,
        include: { sender: { select: { id: true, fullName: true, username: true, profileImage: true } } },
      });

      // Reverse for chronological display on the client.
      responseSuccess(res, {
        message: 'Success',
        data: rows.reverse(),
        meta: { hasMore: rows.length === value.limit },
      });
    }),
  ];

  // ────────────────────────────────────────────────────────────────────────
  // Recipients (admin picker for "New DM")
  // ────────────────────────────────────────────────────────────────────────

  public listRecipients = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const search = String(req.query.search || '').trim();

      // Roles that the operator has hidden from the DM picker (e.g. system
      // accounts, developer logins). Stored as a JSON string array in
      // `dev_direct_chat_excluded_roles`; tolerate any parse failure by
      // falling back to "no exclusion". Resolved to `roleId`s because
      // Prisma's `in`/`notIn` does not support `mode: 'insensitive'`.
      const excludedRoleIds = await this.resolveExcludedRoleIds();

      const rows = await this.prisma.admin.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          isBlocked: false,
          id: { not: adminId },
          ...(excludedRoleIds.length
            ? { roleId: { notIn: excludedRoleIds } }
            : {}),
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { username: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          profileImage: true,
          isOnline: true,
          role: { select: { roleName: true } },
        },
        orderBy: [{ isOnline: 'desc' }, { fullName: 'asc' }],
        take: 100,
      });
      responseSuccess(res, { message: 'Success', data: rows });
    }),
  ];

  /**
   * Read `dev_direct_chat_excluded_roles` and return matching `MngRoles.roleId`s.
   * Compares case-insensitively after trimming so operators can type either
   * "DEVELOPER" or "developer".
   */
  private async resolveExcludedRoleIds(): Promise<number[]> {
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { key: 'dev_direct_chat_excluded_roles' },
        select: { value: true },
      });
      if (!setting?.value) return [];

      const parsed = JSON.parse(setting.value);
      if (!Array.isArray(parsed)) return [];
      const wanted = parsed
        .map((v) => String(v ?? '').trim().toLowerCase())
        .filter(Boolean);
      if (!wanted.length) return [];

      const roles = await this.prisma.mngRoles.findMany({
        where: { deletedAt: null },
        select: { roleId: true, roleName: true },
      });
      return roles
        .filter((r) => wanted.includes(r.roleName.trim().toLowerCase()))
        .map((r) => r.roleId);
    } catch (err: any) {
      logger.warn(`resolveExcludedRoleIds failed: ${err.message}`);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Start conversations
  // ────────────────────────────────────────────────────────────────────────

  public startDirect = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;

      const { value, error } = StartDirectSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }
      const recipientId = String(value.recipientId);
      if (recipientId === adminId) {
        return responseError(res, 400, { code: '400', message: 'Cannot DM yourself' });
      }

      // Find an existing DIRECT conversation that has exactly these two members.
      const existing = await this.prisma.conversation.findFirst({
        where: {
          kind: 'DIRECT',
          deletedAt: null,
          AND: [
            { participants: { some: { adminId } } },
            { participants: { some: { adminId: recipientId } } },
          ],
        },
        select: { id: true },
      });

      const conv = existing
        ? await this.prisma.conversation.findUniqueOrThrow({
            where: { id: existing.id },
            include: { participants: { include: { admin: { select: { id: true, fullName: true, profileImage: true, isOnline: true } } } } },
          })
        : await this.prisma.conversation.create({
            data: {
              kind: 'DIRECT',
              createdById: adminId,
              participants: {
                create: [
                  { adminId, isOwner: true },
                  { adminId: recipientId, isOwner: false },
                ],
              },
            },
            include: { participants: { include: { admin: { select: { id: true, fullName: true, profileImage: true, isOnline: true } } } } },
          });

      // Optional first message in the same call.
      let firstMessage: any = null;
      if (value.message && value.message.trim()) {
        firstMessage = await this.persistMessage(conv.id, adminId, value.message.trim());
        await this.fanOutNewMessage(conv.id, firstMessage);
      }

      // Notify participants that a (possibly new) conversation is in their inbox.
      for (const p of conv.participants) {
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: conv.id,
        });
      }

      responseSuccess(res, {
        message: existing ? 'Conversation already exists' : 'Conversation created',
        data: { conversation: conv, firstMessage },
      });
    }),
  ];

  public startBroadcast = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;

      const { value, error } = StartBroadcastSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }

      const activeAdmins = await this.prisma.admin.findMany({
        where: { deletedAt: null, isActive: true, isBlocked: false },
        select: { id: true },
      });
      if (activeAdmins.length === 0) {
        return responseError(res, 400, { code: '400', message: 'No active admins to broadcast to' });
      }

      const conv = await this.prisma.conversation.create({
        data: {
          kind: 'BROADCAST',
          title: value.title || null,
          createdById: adminId,
          participants: {
            create: activeAdmins.map((a) => ({
              adminId: a.id,
              isOwner: a.id === adminId,
            })),
          },
        },
        include: {
          participants: {
            include: { admin: { select: { id: true, fullName: true, profileImage: true } } },
          },
        },
      });

      const firstMessage = await this.persistMessage(conv.id, adminId, value.message.trim());
      await this.fanOutNewMessage(conv.id, firstMessage);

      // Surface the new conversation on every participant's inbox.
      for (const p of conv.participants) {
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: conv.id,
        });
      }

      responseSuccess(res, {
        message: 'Broadcast sent',
        data: { conversation: conv, firstMessage },
      });
    }),
  ];

  // ────────────────────────────────────────────────────────────────────────
  // Messages
  // ────────────────────────────────────────────────────────────────────────

  public sendMessage = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const { value, error } = SendMessageSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }

      const isMember = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId: id, adminId },
        select: { id: true },
      });
      if (!isMember) {
        return responseError(res, 403, { code: '403', message: 'Not a participant' });
      }

      const message = await this.persistMessage(id, adminId, value.content, value.attachmentUrl);
      await this.fanOutNewMessage(id, message);

      responseSuccess(res, { message: 'Message sent', data: message });
    }),
  ];

  public markAsRead = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const part = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId: id, adminId },
      });
      if (!part) {
        return responseError(res, 403, { code: '403', message: 'Not a participant' });
      }

      const now = new Date();
      await this.prisma.conversationParticipant.update({
        where: { id: part.id },
        data: { lastReadAt: now },
      });

      // Inform the user's other sessions (multi-tab) so unread badges sync.
      this.socket.emitToUser(adminId, SOCKET_EVENT.CONVERSATION_READ, {
        conversationId: id,
        lastReadAt: now.toISOString(),
      });

      responseSuccess(res, { message: 'Marked as read', data: { lastReadAt: now } });
    }),
  ];

  // ────────────────────────────────────────────────────────────────────────
  // Participant management (owner-only, BROADCAST / GROUP only)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Admins NOT yet in this conversation, useful for the "Add participants"
   * picker. Mirrors the DM recipient filtering: active + not-blocked + not
   * the owner themselves.
   */
  public listCandidates = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);
      const search = String(req.query.search || '').trim();

      const conv = await this.requireOwnedManageable(id, adminId, res);
      if (!conv) return;

      const memberIds = conv.participants.map((p) => p.adminId);

      const rows = await this.prisma.admin.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          isBlocked: false,
          id: { notIn: memberIds },
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { username: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          profileImage: true,
          isOnline: true,
          role: { select: { roleName: true } },
        },
        orderBy: [{ isOnline: 'desc' }, { fullName: 'asc' }],
        take: 100,
      });
      responseSuccess(res, { message: 'Success', data: rows });
    }),
  ];

  public addParticipants = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const { value, error } = AddParticipantsSchema.validate(req.body, {
        stripUnknown: true,
      });
      if (error) {
        return responseError(res, 400, { code: '400', message: error.message });
      }

      const conv = await this.requireOwnedManageable(id, adminId, res);
      if (!conv) return;

      const existingIds = new Set(conv.participants.map((p) => p.adminId));
      const adminIdsToAdd = (value.adminIds as string[]).filter(
        (a) => !existingIds.has(a),
      );
      if (adminIdsToAdd.length === 0) {
        return responseSuccess(res, {
          message: 'No new participants to add',
          data: { added: [] },
        });
      }

      // Defensive: only add admins that actually exist + are still active.
      const validAdmins = await this.prisma.admin.findMany({
        where: {
          id: { in: adminIdsToAdd },
          deletedAt: null,
          isActive: true,
          isBlocked: false,
        },
        select: { id: true },
      });
      const validIds = validAdmins.map((a) => a.id);
      if (validIds.length === 0) {
        return responseError(res, 400, {
          code: '400',
          message: 'No active admins matched the supplied ids',
        });
      }

      await this.prisma.conversationParticipant.createMany({
        data: validIds.map((aid) => ({
          conversationId: id,
          adminId: aid,
          isOwner: false,
        })),
        // Race-safe in case two owners click "add" simultaneously.
        skipDuplicates: true,
      });

      // Notify both the newcomers (inbox upsert) and existing members
      // (refresh participant list).
      for (const aid of validIds) {
        this.socket.emitToUser(aid, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: id,
        });
      }
      for (const p of conv.participants) {
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: id,
        });
      }

      responseSuccess(res, {
        message: `Added ${validIds.length} participant(s)`,
        data: { added: validIds },
      });
    }),
  ];

  public removeParticipant = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);
      const targetAdminId = String(req.params.adminId);

      const conv = await this.requireOwnedManageable(id, adminId, res);
      if (!conv) return;

      if (targetAdminId === conv.createdById) {
        return responseError(res, 400, {
          code: '400',
          message: 'Cannot remove the conversation owner',
        });
      }

      const participant = conv.participants.find(
        (p) => p.adminId === targetAdminId,
      );
      if (!participant) {
        return responseError(res, 404, {
          code: '404',
          message: 'Participant not found',
        });
      }

      await this.prisma.conversationParticipant.delete({
        where: { id: participant.id },
      });

      // Remove from the ex-member's inbox; refresh participant lists for
      // everyone still in the thread.
      this.socket.emitToUser(targetAdminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
        conversationId: id,
        deleted: true,
      });
      for (const p of conv.participants) {
        if (p.adminId === targetAdminId) continue;
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: id,
        });
      }

      responseSuccess(res, {
        message: 'Participant removed',
        data: { adminId: targetAdminId },
      });
    }),
  ];

  /**
   * Common gate for owner-only participant management. Returns the
   * conversation with its participants on success; sends an HTTP error and
   * returns `null` otherwise.
   *
   * Rules:
   *  - Conversation must exist and not be soft-deleted.
   *  - Only BROADCAST / GROUP threads have a manageable roster.
   *  - Only the conversation creator may manage it.
   */
  private async requireOwnedManageable(
    id: string,
    adminId: string,
    res: Response,
  ): Promise<
    | {
        id: string;
        kind: ConversationKind;
        createdById: string;
        participants: { id: string; adminId: string }[];
      }
    | null
  > {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        kind: true,
        createdById: true,
        participants: { select: { id: true, adminId: true } },
      },
    });
    if (!conv) {
      responseError(res, 404, { code: '404', message: 'Conversation not found' });
      return null;
    }
    if (conv.kind === 'DIRECT') {
      responseError(res, 400, {
        code: '400',
        message: 'Direct conversations have a fixed two-member roster',
      });
      return null;
    }
    if (conv.createdById !== adminId) {
      responseError(res, 403, {
        code: '403',
        message: 'Only the owner can manage participants',
      });
      return null;
    }
    return conv;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Soft delete (creator only)
  // ────────────────────────────────────────────────────────────────────────

  public remove = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const adminId = this.requireAdminId(req, res);
      if (!adminId) return;
      const id = String(req.params.id);

      const conv = await this.prisma.conversation.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, createdById: true, participants: { select: { adminId: true } } },
      });
      if (!conv) {
        return responseError(res, 404, { code: '404', message: 'Conversation not found' });
      }
      if (conv.createdById !== adminId) {
        return responseError(res, 403, { code: '403', message: 'Only the creator can delete' });
      }

      await this.prisma.conversation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      for (const p of conv.participants) {
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.CONVERSATION_UPSERT, {
          conversationId: id,
          deleted: true,
        });
      }

      responseSuccess(res, { message: 'Conversation deleted', data: { id } });
    }),
  ];

  // ────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ────────────────────────────────────────────────────────────────────────

  private async persistMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachmentUrl?: string | null,
  ) {
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        sender: { select: { id: true, fullName: true, username: true, profileImage: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    // Sender implicitly "reads" their own message — keeps unread badges sane.
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, adminId: senderId },
      data: { lastReadAt: message.createdAt },
    });

    return message;
  }

  private async fanOutNewMessage(conversationId: string, message: any) {
    try {
      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId },
        select: { adminId: true },
      });
      for (const p of participants) {
        this.socket.emitToUser(p.adminId, SOCKET_EVENT.NEW_MESSAGE, {
          conversationId,
          message,
        });
      }
    } catch (err: any) {
      logger.warn(`fanOutNewMessage failed for ${conversationId}: ${err.message}`);
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// Re-export the enum type for downstream consumers (e.g. job emitters) that
// want to import it from this module without reaching into the generated
// Prisma client path.
export type ConversationKindRef = ConversationKind;
export type ConversationRef = Conversation;
