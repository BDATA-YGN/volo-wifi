import { Router, Request } from 'express';
import { Admin, Credential, Plan, WifiStation } from '@/generated/prisma/client';

export interface Route {
  path?: string;
  router: Router;
}

export type CaptiveCredentialContext = Credential & {
  plan?: Plan | null;
  station?: WifiStation | null;
};

export interface AuthenticatedRequest extends Request {
  token: string;
  userId: string;
  phoneNo?: string;
  deviceId?: string;
  countryCode?: string;
  otp?: string;
  otpVerified?: boolean;
  user: Admin;
  credentialId?: string;
  credential?: CaptiveCredentialContext;
  file?: any;
  body: any;
}

export interface DeviceInfo {
  device_id: string;
  device_os: string;
  device_type: string;
}
