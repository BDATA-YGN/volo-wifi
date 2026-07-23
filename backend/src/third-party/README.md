# `src/third-party`

In-house adapters (not npm packages). Registered via `ServicesRegistry` / `Container`.

## Active modules

| Package | Role | Used by |
|---------|------|---------|
| `@bdataMysql` | Prisma `BaseService` + pagination | Most feature controllers |
| `@bdataSocket` | Socket.IO + Redis adapter + online/FCM routing | Auth, uploads, permissions, conversations |
| `@bdataFirebaseFCM` | Push when user offline | `@bdataSocket` |
| `@bdataPrinter` | Receipt HTML + print socket event | `core/receiptEditor` |
| `@bdataAxios` | Outbound HTTP client (SSRF guards) | Exported; wire when calling external APIs |
| `@bdataOAuth` | Google token verify (stub) | Registered in DI; **no public method yet** |

## `_archive/`

- `@bdataMongo` — Mongoose `BaseService`; **zero imports** in this repo.

## Security audit summary

### Critical — fix next

1. **Socket `REGISTER_CONSOLE_ADMIN`** — Client sends only `{ userId }`. Any connection can join another admin’s rooms and receive events. **Fix:** emit session JWT from the console, verify with `JwtService` / `adminToken` before `socket.join`.
2. **Firebase service account** — Prefer `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_SERVICE_ACCOUNT_PATH`. Local `*.json` files stay gitignored; FCM is skipped (no crash) when unset.

### High

3. **Admin passwords (not in third-party but related)** — MD5 in auth controllers; use `utils/password` bcrypt.
4. **`@bdataPrinter/v1` `fetch(src)`** — Receipt images can trigger SSRF if `src` is user-controlled URL. Restrict to `https` allowlist or storage CDN host.
5. **FCM `sendToTopic(userId)`** — Uses admin id as FCM topic name; ensure topics are scoped and not guessable if used in production.

### Medium (addressed or mitigated)

- **`pagination.sort_by`** — Now sanitized to `[a-zA-Z_][a-zA-Z0-9_]*` only.
- **`BaseService.fetchView` / `executeStoredProcedure`** — Disabled (were SQL-injection prone; unused).
- **`@bdataOAuth`** — Google userinfo now uses `Authorization: Bearer` header instead of query string token.
- **`@bdataAxios`** — Blocks private network by default; 10MB body cap; optional proxy off.

### Low / housekeeping

- **`OAuthService.verifyGoogleUser`** — Private, never called; expose when Google login ships.
- **FCM errors** — `sendToDevice` now logs and returns `null` on failure.

## Performance notes

- **BaseService.findAll** — Two queries (findMany + count); normal for paginated lists. Avoid huge `include` trees on list endpoints.
- **Socket** — When `SOCKET_REDIS_ENABLED=true`, Redis adapter + pub/sub for multi-instance. Set `SOCKET_REDIS_ENABLED=false` for single-server dev (in-memory online set; see `.env` remarks).
- **FCM init** — Firebase Admin loads when credentials exist (`FIREBASE_SERVICE_ACCOUNT_JSON` / path / local `{NODE_ENV}.json`); otherwise skipped with a warning.

## Error-handling pattern

| Layer | Behavior |
|-------|----------|
| Controllers | `asyncController` → `ErrorMiddleware` |
| BaseService.create | Logs and rethrows |
| Socket `smartNotify` | FCM catch logged; socket no-op if IO down |
| FCM | Log + return `null` / `undefined` on failure (callers should not assume send succeeded) |
