import Joi from 'joi';

export const AdminSchema = Joi.object({
  fullName: Joi.string().required(),
  username: Joi.string().required(),
  email: Joi.string().trim().email().allow(null, '').empty('').optional(),
  password: Joi.string().required(),
  roleId: Joi.number().integer(),
  phoneNumber: Joi.string().allow(null, ''),
  isActive: Joi.boolean().allow(null, ''),
  isVerified: Joi.boolean().allow(null, ''),
  isBlocked: Joi.boolean().allow(null, ''),
  dateOfBirth: Joi.date().allow(null, ''),
  joinDate: Joi.date().allow(null, ''),
  reporterCode: Joi.string().allow(null, ''),
  employmentType: Joi.string().allow(null, ''),
  createdBy: Joi.string().required().default('system'),
  updatedBy: Joi.string().allow(null, ''),
});

export const AdminUpdateSchema = Joi.object({
  fullName: Joi.string(),
  username: Joi.string(),
  email: Joi.string(),
  password: Joi.string(),
  roleId: Joi.number().integer(),
  createdBy: Joi.string(),
  updatedBy: Joi.string(),
});

export const uploadProfileSchema = Joi.object({
  profileImage: Joi.string().required(),
});

