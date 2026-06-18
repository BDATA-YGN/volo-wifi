import Joi from 'joi';

export const FolderSchema = Joi.object({
  folderName: Joi.string().required(),
  bucket: Joi.string().optional(),
});

export const UploadSchema = Joi.object({
  folder: Joi.string().allow('').optional(),
  bucket: Joi.string().optional(),
  category: Joi.string().allow('').optional(),
});

export const FileOperationSchema = Joi.object({
  key: Joi.string().required(),
  bucket: Joi.string().optional(),
});

export const CopyFileSchema = Joi.object({
  sourceKey: Joi.string().required(),
  destKey: Joi.string().required(),
  bucket: Joi.string().optional(),
});
