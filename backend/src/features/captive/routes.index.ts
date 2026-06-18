import type { Route } from '@/interfaces/express.interface';
import { CaptiveAuthRoute } from './auth/routes';
import { CaptiveDashboardRoute } from './dashboard/routes';

/** Captive portal APIs under `/api/...` (login, session, dashboard). */
export function createCaptiveRoutes(): Route[] {
  return [new CaptiveAuthRoute(), new CaptiveDashboardRoute()];
}
