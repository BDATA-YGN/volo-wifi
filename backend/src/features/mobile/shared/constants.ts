/** HTTP headers expected from mobile clients */
export const MOBILE_HEADERS = {
  authorization: 'authorization',
  deviceId: 'x-device-id',
  deviceOs: 'x-device-os',
  deviceType: 'x-device-type',
  appVersion: 'x-app-version',
  platform: 'x-platform',
  apiVersion: 'x-api-version',
} as const;

export const MOBILE_PLATFORMS = ['ios', 'android'] as const;

/** Admin role names allowed on SMS mobile v1 */
export const SMS_MOBILE_CUSTOMER_ROLE = 'CUSTOMER';
export const SMS_MOBILE_COLLECTOR_ROLE = 'COLLECTOR';

export const SMS_MOBILE_API_PREFIX = '/v1/mobile';
