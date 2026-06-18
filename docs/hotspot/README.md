# MikroTik Hotspot pages — Volo WiFi (MRU001)

Upload this **entire folder** to router **`flash/hotspot/`** before or after importing `MRU001-restore.rsc`.

| File | Purpose |
|------|---------|
| `portal-config.js` | **Edit `VOLO_PORTAL_BASE`** (auth URL, e.g. `https://portal.volowifi.com/auth`) |
| `login.html` | → `{VOLO_PORTAL_BASE}?…` with NAS params |
| `alogin.html` | After RADIUS success → `{portal}/dashboard` |
| `flogin.html` | After RADIUS failure → `{portal}/auth` |

## Required hotspot profile setting (external portal)

The captive portal returns **plain username/password** (http-pap). If the profile prefers
http-chap first, the router rejects the login and `flogin.html` sends the user back to the
portal — **you must log in twice**.

```routeros
/ip hotspot profile set volo_profile login-by=http-pap,cookie
```

Replace `volo_profile` with your profile name (e.g. `mru001-profile`).

Profile `mru001-profile` uses `html-directory=flash/hotspot`.

```routeros
/file print where name~"hotspot/login"
/ip hotspot print detail where name=mru001-hotspot
/ip hotspot profile print detail
```

Restore script: **`../volo-hotspot-restore.rsc`** (172.16.0.0/24) or legacy `../MRU001-restore.rsc` (10.10.10.0/24)
