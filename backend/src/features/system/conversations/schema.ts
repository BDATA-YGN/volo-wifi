import Joi from 'joi';

/** Keep in sync with `frontend/.../conversations/constant.ts`. */
const MESSAGE_MAX = 4000;
const TITLE_MAX = 120;

/** Joi rule for an admin id (UUID v4) — used for participants. */
const adminIdRule = Joi.string().uuid({ version: 'uuidv4' }).required();

/** Start (or open existing) DM with one other admin + optional first message. */
export const StartDirectSchema = Joi.object({
  recipientId: adminIdRule.label('Recipient'),
  message: Joi.string().trim().max(MESSAGE_MAX).allow('', null).optional(),
});

/** Broadcast a message to every active admin. */
export const StartBroadcastSchema = Joi.object({
  title: Joi.string().trim().max(TITLE_MAX).allow('', null).optional(),
  message: Joi.string().trim().min(1).max(MESSAGE_MAX).required(),
});

export const SendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(MESSAGE_MAX).required(),
  attachmentUrl: Joi.string().uri({ allowRelative: true }).allow('', null).optional(),
});

export const ListConversationsQuerySchema = Joi.object({
  kind: Joi.string().valid('DIRECT', 'GROUP', 'BROADCAST', 'ALL').default('ALL'),
  search: Joi.string().trim().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const ListMessagesQuerySchema = Joi.object({
  /** Cursor pagination: messages strictly older than this createdAt timestamp. */
  before: Joi.string().isoDate().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

/**
 * Add one or more admins to a BROADCAST/GROUP conversation.
 * The server silently ignores adminIds that are already participants —
 * makes the operation safely idempotent from the UI.
 */
export const AddParticipantsSchema = Joi.object({
  adminIds: Joi.array()
    .items(adminIdRule)
    .min(1)
    .max(200)
    .required()
    .label('Admin ids'),
});
