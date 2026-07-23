/**
 * @deprecated Prefer env/apply-defaults.mjs (loaded from next.config.mjs).
 * Kept so older tooling that imported ./env.mjs does not break.
 */
import { applyPublicEnvDefaults } from './env/apply-defaults.mjs';

export function validateEnv() {
  applyPublicEnvDefaults();
  if (!process.env.API_URL?.trim()) {
    console.error('Missing API_URL (also fills NEXT_PUBLIC_API_URL). See .env.example');
    process.exit(1);
  }
}
