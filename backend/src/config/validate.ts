import { NODE_ENV } from './core';
import { validateStorageConfig } from './features/storage';
import { env } from './env';

/**
 * Central config validation entry point.
 * Call once during startup (early).
 */
export function validateConfig() {
  validateStorageConfig();

  const isProdLike = NODE_ENV === 'production' || NODE_ENV === 'staging';
  if (isProdLike) {
    if (!env.ALLOWED_ORIGINS?.trim()) {
      throw new Error('ALLOWED_ORIGINS is required in production/staging');
    }
    if (env.ALLOWED_ORIGINS.split(',').some(o => o.trim() === '*')) {
      throw new Error('ALLOWED_ORIGINS must not include * in production/staging');
    }
  }
}

