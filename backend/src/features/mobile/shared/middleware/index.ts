export { MobileDeviceMiddleware } from './mobile-device.middleware';
export { SmsMobileAuthMiddleware } from './sms-mobile-auth.middleware';

import { MobileDeviceMiddleware } from './mobile-device.middleware';
import { SmsMobileAuthMiddleware } from './sms-mobile-auth.middleware';

/** Device envelope + mobile auth (Bearer or cookie). */
export const smsMobileProtectedChain = [MobileDeviceMiddleware, SmsMobileAuthMiddleware] as const;
