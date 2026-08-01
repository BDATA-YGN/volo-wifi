# MikroTik Hotspot pages — Volo WiFi (external captive portal)

Upload this **entire folder** to router **`flash/hotspot/`**.

These pages do **not** inspect session state, show timers, or set cache headers.  
Whatever reason the client hits the NAS (`/login`, session timeout, error, logout, etc.), it is redirected to:

`https://portal-v2.volowifi.com/portal/auth?mac=…&ip=…&nas_ip=…&link-login=…&link-logout=…&link-orig=…`

After a successful RADIUS login (`alogin.html` / `status.html`), the client is sent to the same portal auth URL (no dashboard, no router cache / retry-login page):

`https://portal-v2.volowifi.com/portal/auth`

Without `link-login`, the portal can still POST to `http://{nas_ip}/login` using `nas_ip`. Including `link-login` / `link-logout` is more reliable (exact router paths).

## Files

| File | Behavior |
|------|----------|
| `login.html` | → portal `/portal/auth` |
| `rlogin.html` | Session timeout / HTTP intercept → portal `/portal/auth` (302 + meta + JS) |
| `redirect.html` | Not logged in → portal `/portal/auth`; logged in → `$(link-redirect)` |
| `error.html` / `flogin.html` / `logout.html` | → portal `/portal/auth` |
| `alogin.html` / `status.html` | Login OK / status → portal `/portal/auth` (plain link) |
| `api.json` | RFC7710 `user-portal-url` → portal `/portal/auth` (no session counters) |
| `xml/rlogin.html` | WISPr `LoginURL` → portal |
| `portal-config.js` | URL constants only (optional reference) |

## Router profile

```routeros
/ip hotspot profile set YOUR-PROFILE login-by=http-pap html-directory=flash/hotspot
```

- Use **`http-pap` only** — no `cookie` (cookie re-auth skips the portal after Session-Timeout).

## Walled garden

Allow the new portal host on the router:

```routeros
/ip hotspot walled-garden ip add action=accept dst-host=portal-v2.volowifi.com comment="Volo portal v2"
```

## Change portal URL

Update the same host in:

1. `login.html`, `rlogin.html`, `redirect.html`, `error.html`, `flogin.html`, `logout.html`
2. `alogin.html`, `status.html` (after login)
3. `api.json`
4. `xml/rlogin.html`
5. `portal-config.js`

Then re-upload `hotspot/` to the router.

## Verify after deploy

1. Connect with a voucher → browse until RADIUS session ends (or disconnect hotspot user).
2. Open a new HTTP site → address bar should show **`portal-v2.volowifi.com/portal/auth`**, not the router IP.
3. On iPhone: captive sheet should open the portal, not the router login page.
