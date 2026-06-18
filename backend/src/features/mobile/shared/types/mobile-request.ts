import type { Request } from 'express';
import type { AuthenticatedRequest } from '@/interfaces/express.interface';

/** Device metadata sent by mobile clients (compare: web has no device envelope). */
export type MobileDeviceInfo = {
  deviceId?: string;
  deviceOs?: string;
  deviceType?: string;
  appVersion?: string;
  platform?: 'ios' | 'android' | 'unknown';
  apiVersion?: string;
};

export interface MobileRequest extends Request {
  mobileDevice?: MobileDeviceInfo;
}

export type SmsMobileActorType = 'customer' | 'collector';

export type SmsMobileActor = {
  type: SmsMobileActorType;
  roleName: string;
};

export interface SmsMobileRequest extends AuthenticatedRequest {
  mobileDevice?: MobileDeviceInfo;
  smsActor?: SmsMobileActor;
}
