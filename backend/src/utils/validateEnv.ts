/**
 * @deprecated Startup validation lives in `src/config/env.ts` (envalid) and `validateConfig()`.
 * Kept so existing `server.ts` import keeps working.
 */
export const ValidateEnv = (): void => {
  // envalid runs on first import of `@/config/env`; nothing else required here.
};
