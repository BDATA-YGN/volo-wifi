import Joi from 'joi';

export const FileLogSchema = Joi.object({
  fileName: Joi.string().required(),
  url: Joi.string().required(),
  type: Joi.string().required(),
  size: Joi.number().required(),
  mimeType: Joi.string().required(),
  category: Joi.string().required(),
  folder: Joi.string().allow(null, ''),
  isFolder: Joi.boolean().default(false),
  parentId: Joi.string().allow(null, ''),
  path: Joi.string().allow(null, ''),
  isPublic: Joi.boolean().default(false),
  lastModified: Joi.date().allow(null),
  authorId: Joi.string().allow(null, ''),
  updatedAt: Joi.date().default(Date.now),
});

export const FileLogUpdateSchema = Joi.object({
  fileName: Joi.string(),
  url: Joi.string(),
  type: Joi.string(),
  size: Joi.number(),
  mimeType: Joi.string(),
  category: Joi.string(),
  folder: Joi.string().allow(null, ''),
  isFolder: Joi.boolean(),
  parentId: Joi.string().allow(null, ''),
  path: Joi.string().allow(null, ''),
  isPublic: Joi.boolean(),
  lastModified: Joi.date().allow(null),
  authorId: Joi.string().allow(null, ''),
  updatedAt: Joi.date().default(Date.now),
});
