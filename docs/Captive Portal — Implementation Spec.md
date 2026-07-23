# Captive Portal — Implementation Spec

> **Purpose:** Reproduce the Wi‑Fi captive portal token/login flows in another project.  
> **Source repo:** `volo-api-console` (`backend/src/features/captive/`, `captive-portal/`, `hotspot/`).  
> **Scope:** Production Wi‑Fi path (Credential / voucher / RADIUS / MikroTik). Legacy phone OTP (`TblUser`) is documented briefly as out-of-scope for Wi‑Fi.

---

## 1. Architecture overview

```
MikroTik Hotspot (login.html)
    │ redirect with mac, ip, nas_ip, link-login, link-logout, link-orig
    ▼
Captive Portal (Next.js)  /auth
    │ POST /api/login  (backend)
    │ sets access_token + refresh_token cookies
    │ then browser submits credentials to NAS link-login
    ▼
MikroTik + FreeRADIUS (http-pap)
    │ Accounting Start / Interim / Stop → RadiusSession
    │ alogin.html → portal /dashboard
    ▼
Backend /api/dashboard/* (JWT cookies)
    │ CaptiveCron (every 3m): close stale RADIUS + sync credential status
```

**Important separation**

| Layer | Role |
|-------|------|
| Portal API login | Validates voucher/user, device limits, quota; issues JWT cookies; stores NAS params |
| NAS / FreeRADIUS | Actually opens internet access (`Access-Accept`) |
| RADIUS accounting | Source of truth for online devices, usage time, single-session pause |
| Cron sync | Closes orphan sessions; updates credential status / remaining quota |

The portal **does not** open the internet itself. After API success it POSTs/GETs the NAS login URL with username/password.

---

## 2. Credential & plan model (must implement)

### 2.1 Credential types

```text
VOUCHER_TOKEN   → login with `token` only (username AND password on NAS = token)
USER_PASSWORD   → login with `username` + `password`
```

### 2.2 Credential status lifecycle

```text
NEW / ACTIVE / SOLD
        │  first successful captive login
        ▼
   ACTIVATED  (activatedAt set)
        │  cron sees RADIUS activity
        ▼
     IN_USE
        │
        ├─ CUMULATIVE_SESSIONS → reconnect allowed while time/data remains
        │                        → CONSUMED / EXPIRED when finished
        │
        └─ SINGLE_SESSION → on real RADIUS STOP (not Cleanup-Timeout)
                            → PAUSED until reseller unlock
                            → CONSUMED when quota / activation window exceeded
```

**Login allowed statuses:** `NEW`, `SOLD`, `ACTIVE`, `ACTIVATED`, `IN_USE`  
**Login blocked:** `PAUSED`, `EXPIRED`, `CONSUMED`, `REVOKED`, or `expiresAt < now`

### 2.3 Plan fields that affect login

| Field | Effect |
|-------|--------|
| `quotaType` | `TIME_ONLY` / `DATA_ONLY` / `TIME_AND_DATA` |
| `timeAmount` + `timeUnit` | Time quota in seconds (`MINUTE*60`, `HOUR*3600`, `DAY*86400`) |
| `maxDevices` | Concurrent device slots (min 1) |
| `timeUsageMode` | `CUMULATIVE_SESSIONS` or `SINGLE_SESSION` |
| `validityDays` | Optional wall-clock validity from activation (admin/expiry logic) |

**Effective max devices**

```text
if timeUsageMode == SINGLE_SESSION → maxDevices = 1
else → max(1, plan.maxDevices ?? 1)
```

### 2.4 Core tables

**Credential**

- `id`, `orgId`, `type`, `status`, `planId`
- `token` (unique, uppercase for vouchers), `username`, `passwordHash`
- Lifecycle: `soldAt`, `activatedAt`, `expiresAt`, `revokedAt`, `singleSessionResellerUnlockAt`
- Cache: `timeRemainingSec`, `dataRemainingMb`

**CaptivePortalSession**

- Stores NAS redirect params for logout UI + MAC binding + short device-slot reservation
- Fields: `credentialId`, `username`, `nasParams` (JSON), timestamps

**RadiusSession**

- FreeRADIUS accounting truth
- Fields: `acctSessionId`, `userName`, `callingStationId` (MAC), `status` (`START`|`INTERIM`|`STOP`)
- Times: `startedAt`, `lastInterimAt`, `stoppedAt`, `sessionTimeSec`, `terminateCause`

---

## 3. End-to-end voucher token login (primary path)

### 3.1 Hotspot redirect

`hotspot/login.html` immediately redirects to:

```text
https://portal.../auth?mac=$(mac)&ip=$(ip)&nas_ip=$(hostname)
  &link-login=$(link-login-esc)
  &link-login-only=$(link-login-only-esc)
  &link-logout=$(link-logout-esc)
  &link-orig=$(link-orig-esc)
```

After NAS auth success, `hotspot/alogin.html` redirects to portal `/dashboard`.

### 3.2 Portal UI steps

1. Capture query params into session/local storage as `nasParams`.
2. User enters alphanumeric token (normalize to **uppercase**).
3. `POST /api/login` with:

```json
{
  "type": "VOUCHER_TOKEN",
  "token": "ABCD1234",
  "nasParams": {
    "mac": "...",
    "ip": "...",
    "nas_ip": "...",
    "link-login": "...",
    "link-logout": "...",
    "link-orig": "..."
  }
}
```

4. On success (cookies set): wait briefly (~750ms), then submit credentials to MikroTik:

```text
username = token
password = token
dst     = portal /dashboard (or link-orig)
```

5. FreeRADIUS accepts → accounting Start → browser lands on `/dashboard`.

### 3.3 Backend `POST /login` gates (exact order)

Implement inside a DB transaction with `SELECT ... FOR UPDATE` on the credential row.

1. **Lookup**
   - `VOUCHER_TOKEN`: `token = UPPER(trim(token))`, `deletedAt = null`
   - `USER_PASSWORD`: `username = trim(username)`, `deletedAt = null`
2. **Password** (USER_PASSWORD only): `password === passwordHash` (plaintext equality for PAP; field name is historical)
3. **Status pre-check:** reject `PAUSED` / terminal / expired
4. **Extract client MAC** from `nasParams` (`mac` | `client_mac` | `clientMac` | `callingStationId`)
   - Normalize: lowercase, strip non-hex; require length ≥ 6
5. **Transaction lock + re-check status**
6. **Activate:** if status `NEW` or `ACTIVE` → set `ACTIVATED` + `activatedAt = now`
7. **Require plan** on credential
8. **Token device bind** (VOUCHER only, if enabled): see §4.2
9. **Device slot check:** see §4.1
10. **Time quota:** sum RADIUS used seconds; if `used >= quota` → set `CONSUMED`, reject
11. **SINGLE_SESSION extras:**
    - If a prior real STOP exists after unlock → set `PAUSED`, reject
    - If wall-clock since `activatedAt` ≥ plan time quota → set `CONSUMED`, reject
12. **Persist CaptivePortalSession** if `nasParams` is an object
13. **Audit** `AUTH_SUCCESS`
14. **Set cookies** `access_token` + `refresh_token` (15 minutes each)
15. Respond `{ message, data: { ok: true } }`

`IN_USE` is **not** set at login; cron sets it after RADIUS activity.

---

## 4. Concurrent devices & MAC binding

Source: `backend/src/features/captive/auth/concurrent-device-guard.ts`

### 4.1 Occupied device slots

Constants:

| Constant | Value | Meaning |
|----------|-------|---------|
| `PORTAL_LOGIN_SLOT_MS` | 3 minutes | Recent portal logins reserve a slot before Accounting-Start |
| `RADIUS_INTERIM_STALE_MS` | 5 minutes | INTERIM with old `lastInterimAt` treated as ended |

Occupied keys = union of:

1. **Open RADIUS sessions** for `userName ∈ radiusUserNameVariants(credential)`
   - Key = normalized MAC, or `acct:{acctSessionId}` if MAC missing
   - Ended if: status `STOP` / `stoppedAt` set, OR INTERIM stale (>5m)
   - `START` is **not** auto-ended by interim-stale alone
2. **CaptivePortalSession** rows for this credential created in last 3 minutes (MAC from nasParams)

`radiusUserNameVariants`:

```text
[username trimmed] ∪ [token, token.toUpperCase()]  (non-empty only)
```

### 4.2 Slot assertion rules

```text
if clientMac already occupied → ALLOW (same-device reconnect / portal retry)
else if occupied.size >= maxDevices → DEVICE_LIMIT_REACHED
else if !clientMac && occupied.size > 0 → RADIUS_SESSION_ACTIVE
else → ALLOW
```

### 4.3 Voucher token ↔ first MAC bind

Env: `CAPTIVE_TOKEN_DEVICE_BIND_ENABLED` (default **on**; disable with `false` / `0`)

```text
Walk CaptivePortalSession oldest → newest
First stored MAC becomes boundMac
If boundMac exists and (no clientMac OR clientMac != boundMac)
  → TOKEN_DEVICE_MISMATCH
```

USER_PASSWORD logins skip this bind.

---

## 5. SINGLE_SESSION vs CUMULATIVE_SESSIONS

### CUMULATIVE_SESSIONS (default)

- User may disconnect/reconnect while time remains.
- Time usage = sum of RADIUS session seconds (including active).
- When used ≥ quota → `CONSUMED`.

### SINGLE_SESSION

- Effective `maxDevices = 1`.
- One online period per reseller cycle.
- On **real** RADIUS STOP (`terminateCause != 'Cleanup-Timeout'`) → credential becomes `PAUSED`.
- Reseller unlock sets `singleSessionResellerUnlockAt`; only stops **after** that timestamp block again.
- Activation window: if `now - activatedAt >= planTimeQuotaSec` → `CONSUMED` even with little RADIUS usage.
- Usage aggregation for login uses `since = singleSessionResellerUnlockAt ?? activatedAt ?? soldAt`.

**Cleanup-Timeout** stops (from cron) must **not** pause the voucher.

---

## 6. JWT / session cookies

| Cookie | Payload | Expiry | Secret env |
|--------|---------|--------|------------|
| `access_token` | `{ credentialId }` | 15m | `ACCESS_TOKEN_SECRET` |
| `refresh_token` | `{ credentialId }` | 15m | `REFRESH_TOKEN_SECRET` |

Cookie options:

- `path: /`
- `httpOnly` / `secure` only when `NODE_ENV === production`

**Authenticated routes:** require `refresh_token`; verify access (refresh if expired); load Credential by `credentialId`; attach to request.

**Logout:** clear cookies + audit `AUTH_LOGOUT`. Does **not** CoA/disconnect RADIUS. UI uses stored NAS `logout_url` / `link-logout` separately.

**Portal session endpoints**

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/session` | `{ nasParams }` | Persist NAS params for current credential |
| GET | `/session` | — | Latest `{ username, nasParams }` or null |

---

## 7. Rate limiting (`POST /login`)

| Limiter | Default | Key |
|---------|---------|-----|
| Per IP | 30 failures / 15m | client IP |
| Per credential | 8 failures / 15m | `login:token:TOKEN` or `login:user:username` |

- `skipSuccessfulRequests: true` (only failures count)
- Disable IP limiter: `CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED=false`
- Tunables: `CAPTIVE_LOGIN_IP_MAX`, `CAPTIVE_LOGIN_IP_WINDOW_MS`, `CAPTIVE_LOGIN_CREDENTIAL_MAX`, `CAPTIVE_LOGIN_CREDENTIAL_WINDOW_MS`
- On exceed → HTTP 429, code `TOO_MANY_REQUESTS`

---

## 8. API surface (Wi‑Fi relevant)

Base mount: `/api` (example port `6557`).

### Auth

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | rate limits | Token or user/pass + optional nasParams |
| POST | `/logout` | ClientAuth | Clear cookies |
| POST | `/session` | ClientAuth | Save nasParams |
| GET | `/session` | ClientAuth | Read latest session |
| GET | `/check/server` | none | Health |

### Dashboard (all ClientAuth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard` | Aggregated user/plan/usage/connection |
| GET | `/dashboard/usage` | Today / total usage |
| GET | `/dashboard/connection` | Online status, IP, session time |
| GET | `/dashboard/plan` | Plan + remaining balance |
| GET | `/dashboard/plans` | Org active plans list |

Online status is derived from open `RadiusSession` (`START`/`INTERIM`, `stoppedAt` null) matched by username variants.

---

## 9. Error codes (implement exactly)

HTTP 400 unless noted. Response shape: `{ error: { code, message, details? } }`

| Code | When |
|------|------|
| `INVALID_CREDENTIAL` | Not found / bad password / missing plan |
| `CREDENTIAL_PAUSED` | Status PAUSED, or SINGLE_SESSION after prior STOP |
| `CREDENTIAL_INACTIVE` | EXPIRED / CONSUMED / REVOKED |
| `CREDENTIAL_EXPIRED` | `expiresAt` past |
| `CREDENTIAL_CONSUMED` | Time quota exhausted / activation window exceeded |
| `RADIUS_SESSION_ACTIVE` | Other device online and client MAC missing |
| `DEVICE_LIMIT_REACHED` | Occupied slots ≥ maxDevices |
| `TOKEN_DEVICE_MISMATCH` | Voucher already bound to another MAC |
| `UNAUTHORIZED` | Missing auth on protected routes |
| `INVALID_PAYLOAD` | Missing nasParams on saveSession |
| `TOO_MANY_REQUESTS` | 429 rate limit |
| `INTERNAL_SERVER_ERROR` | 500 |

Optional/reserved (may exist in i18n without current throw sites):  
`CAPTIVE_LOGIN_WINDOW_EXPIRED`, `NO_TIME_REMAINING`, `NO_DATA_REMAINING`.

---

## 10. Cron / maintenance (required for correct device limits)

### CaptiveCron — every 3 minutes (`Asia/Yangon`)

1. Close stale RADIUS rows (`START`/`INTERIM`, no `stoppedAt`) when:
   - No interim/activity for **5 minutes**, or
   - Open longer than **2 hours**, or
   - `sessionTimeSec` exceeded wall elapsed by >120s
2. Mark them `STOP` with `terminateCause = Cleanup-Timeout`
3. Run credential sync (status + remaining quota)

### Credential sync effects (summary)

- Recompute `timeRemainingSec`
- Set `IN_USE` / `PAUSED` / `CONSUMED` / `EXPIRED` as appropriate
- SINGLE_SESSION: pause on real STOP with time left
- Consume when activation window exceeded or remaining ≤ 0 (and related thresholds)

Without this cron, power-loss NAS sessions stay “online” forever and block device slots / Simultaneous-Use.

---

## 11. NAS / MikroTik integration checklist

1. Hotspot profile: `login-by=http-pap` (no cookie re-auth that bypasses portal).
2. Upload `hotspot/` pages so `login.html` redirects to portal `/auth` with MikroTik variables.
3. `alogin.html` → portal `/dashboard`.
4. FreeRADIUS authenticates voucher as User-Name=token / Password=token (or real user/pass).
5. Accounting writes into `RadiusSession` (or equivalent) with `callingStationId` MAC.
6. Portal after API login must redirect/submit to NAS `link-login` / `login_url`.

Ruijie-style params (`login_url`, `logout_url`, `uamip`, …) should also be accepted in `nasParams`; MAC extraction keys are shared.

---

## 12. Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ACCESS_TOKEN_SECRET` | JWT access | `ACCESS_SECRET` |
| `REFRESH_TOKEN_SECRET` | JWT refresh | `REFRESH_SECRET` |
| `NODE_ENV` | cookie secure/httpOnly | — |
| `CAPTIVE_TOKEN_DEVICE_BIND_ENABLED` | Bind voucher to first MAC | on |
| `CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED` | Per-IP rate limit | on |
| `CAPTIVE_LOGIN_IP_MAX` | | 30 |
| `CAPTIVE_LOGIN_IP_WINDOW_MS` | | 900000 |
| `CAPTIVE_LOGIN_CREDENTIAL_MAX` | | 8 |
| `CAPTIVE_LOGIN_CREDENTIAL_WINDOW_MS` | | 900000 |
| `CAPTIVE_LOGIN_DEBUG` | Log login gate traces | off |
| Portal `API_URL` | BFF → backend | required |

---

## 13. Pseudocode — login transaction

```ts
async function login({ type, token, username, password, nasParams }) {
  const credential = await findCredential(type, token, username);
  if (!credential) throw INVALID_CREDENTIAL;
  if (type === USER_PASSWORD && password !== credential.passwordHash) throw INVALID_CREDENTIAL;
  assertNotPausedOrTerminal(credential);
  assertNotPastExpiresAt(credential);

  const clientMac = extractClientMacFromNasParams(nasParams);

  return await db.transaction(async (tx) => {
    await lockCredential(tx, credential.id);
    const locked = await reload(tx, credential.id);
    assertNotPausedOrTerminal(locked);

    if (locked.status in [NEW, ACTIVE]) {
      locked = await activate(tx, locked); // ACTIVATED + activatedAt
    }
    const plan = requirePlan(locked);
    const variants = radiusUserNameVariants(locked);
    const maxDevices = effectiveMaxDevices(plan);

    if (type === VOUCHER_TOKEN) {
      await assertTokenBoundToSameDevice(tx, locked.id, clientMac);
    }
    await assertDeviceSlotAvailableForLogin(tx, {
      credentialId: locked.id,
      userNameVariants: variants,
      maxDevices,
      clientMac,
    });

    const used = await aggregateRadiusUsedSeconds(locked, plan);
    if (used != null && used.usedSec >= used.quotaSec) {
      await markConsumed(tx, locked.id);
      throw CREDENTIAL_CONSUMED;
    }

    if (plan.timeUsageMode === SINGLE_SESSION) {
      if (await hasBlockingStoppedRadiusSession(variants, locked.singleSessionResellerUnlockAt)) {
        await markPaused(tx, locked.id);
        throw CREDENTIAL_PAUSED;
      }
      if (isPlanActivationWindowExceeded(locked, plan)) {
        await markConsumed(tx, locked.id);
        throw CREDENTIAL_CONSUMED;
      }
    }

    if (nasParams && typeof nasParams === 'object') {
      await createCaptivePortalSession(tx, locked, nasParams);
    }

    return locked;
  }).then(async (locked) => {
    await auditAuthSuccess(locked, clientMac);
    setJwtCookies(res, locked.id);
    return { ok: true };
  });
}
```

---

## 14. Edge cases (must preserve)

1. Token lookup is **uppercase**; RADIUS username variants include both cases.
2. Same MAC may always re-login within slot logic (portal retry / reconnect).
3. No MAC + any occupied slot → reject (`RADIUS_SESSION_ACTIVE`).
4. Portal 3‑minute reservation prevents two devices racing before Accounting-Start.
5. Logout clears JWT only; internet stays up until NAS logout / idle / RADIUS stop.
6. `SOLD` / `ACTIVATED` / `IN_USE` can login; only `PAUSED` + terminals blocked.
7. Cron `Cleanup-Timeout` must not count as a “real” single-session completion.
8. Password comparison for PAP is plaintext equality against `passwordHash` field.
9. Fresh NAS challenge on `/auth` should clear portal cookies so the user must re-enter the voucher (no silent auto NAS login).
10. Rate limits count failures only.

---

## 15. Minimal recreate checklist

- [ ] Models: Credential, Plan, CaptivePortalSession, RadiusSession + enums above
- [ ] `POST /login` transaction matching §3.3 + §4
- [ ] JWT cookies 15m + ClientAuth middleware
- [ ] Portal: store NAS params → login API → submit to MikroTik with token/token
- [ ] Hotspot `login.html` / `alogin.html` redirects
- [ ] FreeRADIUS accounting → RadiusSession
- [ ] Cron: stale RADIUS close (5m / 2h) + credential sync
- [ ] Error codes + client i18n map
- [ ] Rate limits (IP + credential)
- [ ] Optional: token MAC bind env flag

---

## 16. Out of scope for Wi‑Fi clone (legacy)

These exist under the same captive auth controller but are **not** used by the current Wi‑Fi portal UI:

- `POST /authorize` free device user
- Phone register OTP (`/check/phone_no`, `/register/otp/*`, `/user/create`)
- Forget-password OTP (`/forget-password/*`, `/user/password`)
- Main-api notifications / storage / mobile layout

Skip unless the new project also needs the old mobile-app user model.

---

## 17. Key source files (reference)

| Area | Path |
|------|------|
| Login controller | `backend/src/features/captive/auth/controller.ts` |
| Routes | `backend/src/features/captive/auth/routes.ts` |
| Request schema | `backend/src/features/captive/auth/schema.ts` |
| Device / MAC guards | `backend/src/features/captive/auth/concurrent-device-guard.ts` |
| Messages / codes | `backend/src/features/captive/messages.ts` |
| JWT | `backend/src/features/captive/services/jwt.ts` |
| Rate limit | `backend/src/middlewares/captive-login-rate-limit.middleware.ts` |
| Quota / single-session helpers | `backend/src/features/shared/credentials/credential-sync.service.ts` |
| Stale session cron | `backend/src/features/captive/captive-cron.service.ts` |
| Dashboard | `backend/src/features/captive/dashboard/` |
| Prisma models | `backend/src/prisma/models/volo.prisma` |
| Portal NAS redirect | `captive-portal/lib/nas-redirect.ts` |
| Portal auth page | `captive-portal/app/auth/page.tsx` |
| Hotspot pages | `hotspot/login.html`, `hotspot/alogin.html` |

---

## 18. Prompt snippet for AI in the new project

Copy/paste:

```text
Implement a Wi‑Fi captive portal voucher login matching this spec
(backend/docs/CAPTIVE_PORTAL_FLOWS.md).

Must include:
1) POST /login for VOUCHER_TOKEN and USER_PASSWORD with the exact gate order
2) CaptivePortalSession + RadiusSession based concurrent device limits
3) Optional first-MAC bind for vouchers
4) SINGLE_SESSION pause/unlock and activation-window consume rules
5) JWT cookie auth for dashboard
6) Stale RADIUS cleanup cron + credential sync
7) MikroTik flow: portal validates → browser logs into NAS with token/token

Preserve error codes and edge cases from the spec. Prefer behavior parity
over renaming concepts.
```
