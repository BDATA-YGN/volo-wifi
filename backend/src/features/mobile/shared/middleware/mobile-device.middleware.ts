import { NextFunction, Response } from 'express';
import { MOBILE_HEADERS, MOBILE_PLATFORMS } from '../constants';
import type { MobileDeviceInfo, MobileRequest } from '../types/mobile-request';

const MAX_DEVICE_HEADER_LENGTH = 128;

const readHeader = (req: MobileRequest, key: string): string | undefined => {
  const raw = req.headers[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_DEVICE_HEADER_LENGTH
    ? trimmed.slice(0, MAX_DEVICE_HEADER_LENGTH)
    : trimmed;
};

const parsePlatform = (raw?: string): MobileDeviceInfo['platform'] => {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if ((MOBILE_PLATFORMS as readonly string[]).includes(lower)) {
    return lower as MobileDeviceInfo['platform'];
  }
  return 'unknown';
};

/**
 * Parses mobile client headers onto `req.mobileDevice`.
 * Does not block requests — run before auth on public routes too.
 */
export const MobileDeviceMiddleware = (req: MobileRequest, _res: Response, next: NextFunction) => {
  req.mobileDevice = {
    deviceId: readHeader(req, MOBILE_HEADERS.deviceId),
    deviceOs: readHeader(req, MOBILE_HEADERS.deviceOs),
    deviceType: readHeader(req, MOBILE_HEADERS.deviceType),
    appVersion: readHeader(req, MOBILE_HEADERS.appVersion),
    platform: parsePlatform(readHeader(req, MOBILE_HEADERS.platform)),
    apiVersion: readHeader(req, MOBILE_HEADERS.apiVersion),
  };
  next();
};
