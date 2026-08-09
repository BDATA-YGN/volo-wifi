import Joi from 'joi';
import { formatMacColon } from '@/utils/mac-address';
import { STATION_STATUSES } from './constants';

const codePattern = /^[A-Z0-9][A-Z0-9_-]{0,47}$/;

const stationFields = {
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(codePattern)
    .message('Code must use A-Z, 0-9, underscore, or hyphen'),
  name: Joi.string().trim().min(2).max(128),
  location: Joi.string().trim().max(200).allow('', null),
  township: Joi.string().trim().max(300).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  stationSizeId: Joi.string().uuid(),
  status: Joi.string().valid(...STATION_STATUSES),
  portalBaseUrl: Joi.string().trim().max(500).allow('', null),
  nasIdentifier: Joi.string().trim().max(128).allow('', null),
  radiusClientIp: Joi.string().trim().max(45).allow('', null),
  /**
   * Ruijie / gateway `nas_mac`. Any common format accepted; stored as `aa:bb:cc:dd:ee:ff`.
   * Captive site-lock compares via normalizeMacKey (separator-insensitive).
   */
  nasMac: Joi.string()
    .trim()
    .max(64)
    .allow('', null)
    .custom((value, helpers) => {
      if (value == null || value === '') return null;
      const formatted = formatMacColon(value);
      if (!formatted) {
        return helpers.error('any.invalid');
      }
      return formatted;
    })
    .messages({
      'any.invalid':
        'NAS MAC must be a 12-digit hex address (aa:bb:…, aa-bb-…, or aabbccddeeff)',
    }),
  radiusSecret: Joi.string().trim().max(128).allow('', null),
  vlanId: Joi.string().trim().max(32).allow('', null),
  radiusVendorProfileId: Joi.string().uuid().allow(null),
};

export const SitesCreateSchema = Joi.object({
  ...stationFields,
  code: stationFields.code.required(),
  name: stationFields.name.required(),
  stationSizeId: stationFields.stationSizeId.required(),
  location: stationFields.location.optional(),
  township: stationFields.township.optional(),
  address: stationFields.address.optional(),
  status: stationFields.status.default('ACTIVE'),
  portalBaseUrl: stationFields.portalBaseUrl.optional(),
  nasIdentifier: stationFields.nasIdentifier.optional(),
  radiusClientIp: stationFields.radiusClientIp.optional(),
  nasMac: stationFields.nasMac.optional(),
  radiusSecret: stationFields.radiusSecret.optional(),
  vlanId: stationFields.vlanId.optional(),
  radiusVendorProfileId: stationFields.radiusVendorProfileId.optional(),
}).unknown(false);

export const SitesUpdateSchema = Joi.object({
  ...stationFields,
  code: stationFields.code.optional(),
  name: stationFields.name.optional(),
  stationSizeId: stationFields.stationSizeId.optional(),
  location: stationFields.location.optional(),
  township: stationFields.township.optional(),
  address: stationFields.address.optional(),
  status: stationFields.status.optional(),
  portalBaseUrl: stationFields.portalBaseUrl.optional(),
  nasIdentifier: stationFields.nasIdentifier.optional(),
  radiusClientIp: stationFields.radiusClientIp.optional(),
  nasMac: stationFields.nasMac.optional(),
  radiusSecret: stationFields.radiusSecret.optional(),
  vlanId: stationFields.vlanId.optional(),
  radiusVendorProfileId: stationFields.radiusVendorProfileId.optional(),
})
  .min(1)
  .unknown(false);
