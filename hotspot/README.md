# MikroTik Hotspot pages — Volo WiFi (external captive portal)

Upload this **entire folder** to router **`flash/hotspot/`**.

These pages do **not** inspect session state, show timers, or set cache headers.  
Whatever reason the client hits the NAS (`/login`, session timeout, error, logout, etc.), it is redirected to:

`https://portal-v2.volowifi.com/portal/auth?mac=…&ip=…&nas_ip=$(server-address)&NASID=$(identity)&…`

After a successful RADIUS login (`alogin.html` / `status.html`), the client is sent to the same portal auth URL (no dashboard, no router cache / retry-login page):

`https://portal-v2.volowifi.com/portal/auth`

Without `link-login`, the portal falls back to `http://{nas_ip}/login` when `mac`/`ip` are present (MikroTik http-pap). Including `link-login` / `link-logout` is more reliable.

Ruijie gateways should redirect to the same portal URL with vendor params (`login_url`, `uamip`+`uamport`, `gw_address`, or ePortal markers). The portal picks MikroTik vs Ruijie handoff from those query keys.

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

## Query variables (site lock vs login handoff)

Site lock matches **NAS-Identifier or NAS MAC only**. NAS IP is never used (many sites share the same private hotspot IP).

MikroTik Hotspot HTML **cannot** send a NAS MAC. There is no `$(nas-mac)`. `$(mac)` is the **client** MAC — never send it as `nas_mac`.

| Query key | MikroTik variable | Used for | Notes |
|-----------|-------------------|----------|--------|
| `NASID` | `$(identity)` | **Site lock** | Must equal Site Directory NAS-Identifier (`/system identity`). |
| `nas_mac` | *(none)* | Site lock | Not available on MikroTik. Ruijie sends this. |
| `nas_ip` | `$(server-address)` | Router login URL only | Hotspot IP for `http://{nas_ip}/login`. Not used to pick a site. |
| `mac` | `$(mac)` | Session bind | **Client** MAC, not the router. |
| `hostname` | `$(hostname)` | Debug | DNS name (`wifi.local`). |

Ruijie redirects are unchanged: they already send `NASID` and/or `nas_mac`.

## Router profile

Set identity and hotspot address so they match Site Directory:

```routeros
/system identity set name=ST-YOURSITE
/ip hotspot profile set YOUR-PROFILE \
    hotspot-address=10.10.10.1 \
    login-by=http-pap \
    html-directory=flash/hotspot \
    use-radius=yes \
    radius-accounting=yes
```

- `identity` **must** equal the site **NAS-Identifier** (this is how MikroTik site-lock works).
- `hotspot-address` is the RADIUS / login IP only — not used to verify the site.
- Use **`http-pap` only** — no `cookie` (cookie re-auth skips the portal after Session-Timeout).

Confirm on the router:

```routeros
/system identity print
/ip hotspot profile print
/ip hotspot print
```

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

1. Connect a client and open any HTTP site. Address bar should show **`portal-v2.volowifi.com/portal/auth`**.
2. Confirm `NASID=` equals `/system identity` and the site **NAS-Identifier**.
3. Compare those values with Site Directory → NAS-Identifier (or NAS MAC on Ruijie).
4. Connect with a voucher → browse until RADIUS session ends (or disconnect hotspot user).
5. On iPhone: captive sheet should open the portal, not the router login page.
