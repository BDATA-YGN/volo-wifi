# MikroTik Hotspot pages — Volo WiFi (external captive portal)

Upload this **entire folder** to router **`flash/hotspot/`**.

These pages do **not** inspect session state, show timers, or set cache headers.  
Whatever reason the client hits the NAS (`/login`, session timeout, error, logout, etc.), it is redirected to:

`https://portal.volowifi.com/auth?mac=…&ip=…&nas_ip=…&link-login=…&link-logout=…&link-orig=…`

Without `link-login`, the portal can still POST to `http://{nas_ip}/login` using `nas_ip`. Including `link-login` / `link-logout` is more reliable (exact router paths).

## Files

| File | Behavior |
|------|----------|
| `login.html` | → portal `/auth` |
| `rlogin.html` | Session timeout / HTTP intercept → portal `/auth` (302 + meta + JS) |
| `redirect.html` | Not logged in → portal `/auth`; logged in → `$(link-redirect)` |
| `error.html` / `flogin.html` / `logout.html` | → portal `/auth` |
| `alogin.html` / `status.html` | Login OK / status → portal `/dashboard` |
| `api.json` | RFC7710 `user-portal-url` → portal `/auth` (no session counters) |
| `xml/rlogin.html` | WISPr `LoginURL` → portal |
| `portal-config.js` | URL constants only (optional reference) |

## Router profile

```routeros
/ip hotspot profile set YOUR-PROFILE login-by=http-pap html-directory=flash/hotspot
```

- Use **`http-pap` only** — no `cookie` (cookie re-auth skips the portal after Session-Timeout).

## Change portal URL

Update the same host in:

1. `login.html`, `rlogin.html`, `redirect.html`, `error.html`, `flogin.html`, `logout.html`
2. `alogin.html`, `status.html` (dashboard)
3. `api.json`
4. `xml/rlogin.html`
5. `portal-config.js`

Then re-upload `hotspot/` to the router.

## Verify after deploy

1. Connect with a voucher → browse until RADIUS session ends (or disconnect hotspot user).
2. Open a new HTTP site → address bar should show **`portal.volowifi.com/auth`**, not the router IP.
3. On iPhone: captive sheet should open the portal, not the router login page.
