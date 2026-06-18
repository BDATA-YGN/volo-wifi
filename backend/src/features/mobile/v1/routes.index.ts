import type { Route } from '@/interfaces/express.interface';
import { MobileAuthRoute } from './auth/routes';

/** Mobile APIs under `/v1/mobile/...` */
export function createMobileV1Routes(): Route[] {
  return [new MobileAuthRoute()];
}
