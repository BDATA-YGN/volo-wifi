import { port } from 'envalid';
import Joi from 'joi';

export const PrinterSchema = Joi.object({
  printerName: Joi.string().required(),
  desc: Joi.string().optional(),
  port: Joi.string().required(),
  baudRate: Joi.number().required(),
  width: Joi.string().required(),
  height: Joi.string().required(),
  preview: Joi.boolean().required(),
  margin: Joi.string().required(),
  copies: Joi.number().required(),
  timeOutPerLine: Joi.number().required(),
  pageSize: Joi.string().required(),
  silent: Joi.boolean().required(),
  type: Joi.string().required()
});


export const PrinterUpdateSchema = Joi.object({
  printerName: Joi.string(),
  port: Joi.string(),
  baudRate: Joi.string(),
  
});

export const uploadProfileSchema = Joi.object({
  profileImage: Joi.string().required(),
});