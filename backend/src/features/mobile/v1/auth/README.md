# Mobile v1 auth (`/v1/mobile/auth`)

Collector and customer sign-in using the shared `Admin` + `AdminToken` session model.

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | Public | IP rate-limited; account lockout via `login-lockout.service` |
| POST | `/token/refresh` | Public | Rotates refresh token; reuse revokes all sessions |
| GET | `/me` | Bearer / cookie | Returns actor profile |
| POST | `/logout` | Bearer / cookie | Invalidates current access token |
| POST | `/change-password` | Bearer / cookie | Revokes other device sessions |

## Security controls

- **Username enumeration**: unknown usernames return the same `401 INVALID_CREDENTIALS` message as a wrong password; a dummy bcrypt compare runs for timing parity.
- **Account lockout**: existing `dev_max_login_attempts` settings apply per account.
- **IP rate limits**: in-process limits on login (30 / 15 min) and refresh (60 / 15 min) per IP. Use Redis for multi-instance deployments.
- **Input bounds**: username ≤ 64 chars; password ≤ 128 chars (bcrypt DoS mitigation).
- **Actor gate**: tokens are issued only after `CUSTOMER` / `COLLECTOR` role + linked profile checks succeed.
- **Refresh rotation**: each refresh invalidates the previous row and mints a new pair. Reusing an old refresh token revokes **all** active sessions for that admin.
- **Password change**: other sessions are invalidated; the current device stays signed in.
- **Device headers**: `x-device-*` values are trimmed and capped at 128 characters.

## Client requirements

- Send `x-sms-mobile-actor: collector|customer` on auth calls when not using actor-scoped cookies (required for refresh when multiple sessions could exist).
- Mobile native clients should use `Authorization: Bearer` + store refresh tokens securely (Keychain / Keystore).

## Error codes

| Code | HTTP | When |
|------|------|------|
| `INVALID_CREDENTIALS` | 401 | Bad username/password |
| `ACCOUNT_BLOCKED` | 403 | Admin blocked |
| `ACCOUNT_LOCKED` | 429 | Too many failed logins |
| `RATE_LIMITED` | 429 | Too many requests from one IP |
| `INVALID_TOKEN` | 401 | Missing/invalid access or refresh token |
| `SESSION_REVOKED` | 401 | Refresh token reuse detected |
| `FORBIDDEN` | 403 | Wrong role or missing customer link |
| `ACTOR_REQUIRED` | 400 | Cannot resolve collector vs customer session |
| `VALIDATION_ERROR` | 400 | Joi schema failure |
