import Joi from 'joi';

export const MenuGroupSchema = Joi.object({
  key: Joi.string().min(1).required().messages({
    'string.base': 'Key must be a string',
    'string.min': 'Key is required',
    'any.required': 'Key is required',
  }),
  title: Joi.string().min(1).required().messages({
    'string.base': 'Title must be a string',
    'string.min': 'Title is required',
    'any.required': 'Title is required',
  }),
  icon: Joi.string().optional().allow('').messages({
    'string.base': 'Icon must be a string',
  }),
  mode: Joi.number().integer().optional(),
}).unknown(false);

export const MenuItemSchema = Joi.object({
  key: Joi.string().min(1).required().messages({
    'string.base': 'Key must be a string',
    'string.min': 'Key is required',
    'any.required': 'Key is required',
  }),
  title: Joi.string().min(1).required().messages({
    'string.base': 'Title must be a string',
    'string.min': 'Title is required',
    'any.required': 'Title is required',
  }),
  icon: Joi.string().optional().allow('').messages({
    'string.base': 'Icon must be a string',
  }),
  url: Joi.string().min(1).required().messages({
    'string.base': 'URL must be a string',
    'string.min': 'URL is required',
    'any.required': 'URL is required',
  }),
  groupId: Joi.number().integer().positive().required().messages({
    'number.base': 'Group ID must be a number',
    'number.integer': 'Group ID must be an integer',
    'number.positive': 'Group ID must be a positive integer',
    'any.required': 'Group ID is required',
  }),
  position: Joi.number().integer().positive().optional(),
}).unknown(false);

export const MenuGroupPositionSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be a positive integer',
    'any.required': 'ID is required',
  }),
  position: Joi.number().integer().positive().required().messages({
    'number.base': 'Position must be a number',
    'number.integer': 'Position must be an integer',
    'number.positive': 'Position must be a positive integer',
    'any.required': 'Position is required',
  }),
}).unknown(false);

export const MenuItemPositionSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be a positive integer',
    'any.required': 'ID is required',
  }),
  position: Joi.number().integer().positive().required().messages({
    'number.base': 'Position must be a number',
    'number.integer': 'Position must be an integer',
    'number.positive': 'Position must be a positive integer',
    'any.required': 'Position is required',
  }),
}).unknown(false);

// Define schema for bulk update
export const BulkMenuUpdateSchema = Joi.array().items(
  Joi.object({
    id: Joi.number().required(),
    key: Joi.string().required(),
    title: Joi.string().required(),
    icon: Joi.string().optional().allow(null),
    position: Joi.number().required(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number().required(),
        key: Joi.string().required(),
        title: Joi.string().required(),
        icon: Joi.string().optional().allow(null),
        url: Joi.string().optional().allow(null),
        position: Joi.number().required(),
        groupId: Joi.number().required(),
      })
    ),
  })
);