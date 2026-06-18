import Joi from 'joi';

/**
 * Validation schema for `app_settings` row create / update.
 * Mirrors `frontend/.../app-setting/interface.ts` shape.
 */
export const AppSettingSchema = Joi.object({
  // `key` is required only on CREATE; on UPDATE the id comes from the URL param.
  key: Joi.string().trim().max(150).optional(),
  value: Joi.string().required(),
  valueType: Joi.string()
    .valid('STRING', 'NUMBER', 'BOOLEAN', 'JSON')
    .default('STRING'),
  controlType: Joi.string().trim().allow(null, '').optional(),
  options: Joi.string().allow(null, '').optional(),
  defaultValue: Joi.string().allow(null, '').optional(),
  category: Joi.string().trim().max(50).allow(null, '').optional(),
  labelEn: Joi.string().allow(null, '').optional(),
  labelMy: Joi.string().allow(null, '').optional(),
  description: Joi.string().allow(null, '').optional(),
  sortOrder: Joi.number().integer().optional(),
  isPublic: Joi.boolean().default(false),
});

/** Batch update for the App Drawer / legacy `wrap/app` JSON shape (one row per key in `app_settings`). */
export const AppShellBatchSchema = Joi.object({
  app_name: Joi.string().allow('').optional(),
  app_short_code: Joi.string().max(50).allow('').optional(),
  app_version: Joi.string().max(50).allow('').optional(),
  app_icon: Joi.string().allow('').optional(),
  login_text: Joi.string().allow('').optional(),
  login_icon: Joi.string().allow('').optional(),
  show_menu_logo: Joi.boolean().optional(),
  show_menu_text: Joi.boolean().optional(),
  notifications_enabled: Joi.boolean().optional(),
});
