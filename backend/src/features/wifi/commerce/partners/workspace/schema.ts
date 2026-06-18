import Joi from 'joi';

/** Read-only dashboard — no write payloads */
export const CommercePartnersWorkspaceQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
