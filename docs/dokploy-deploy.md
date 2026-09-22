# Dokploy deployment — Volo WiFi

Monorepo with **two Dokploy applications** (same Git repo, different root directories).

## 1. Backend (`backend/`)

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build type | Nixpacks (default) or Dockerfile |
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm start` |
| Health check | `GET /console/health` (always 200 when the process is up; `ready` in JSON is for login) |

### Ports (one container, three listeners)

| Env | Default | Use |
|-----|---------|-----|
| `PORT` | 6558 | Console API (`/console/*`) |
| `API_PORT` | 6557 | Captive portal API (`/api/*`) |
| `SOCKET_PORT` | 6559 | Socket.IO (`/general/socket.io`) |

In Dokploy, map **container ports to the same numbers as `PORT` / `API_PORT` / `SOCKET_PORT`**. If the process listens on `4458` but the domain targets `6558`, every request (including `/console/health`) returns Cloudflare **502**.

For the console host, use **path-based** routing so the frontend keeps `/` and the API is under `/console`:

- Frontend `console.volowifi.com` → container `4488`
- Backend `console.volowifi.com` + path `/console` → container `PORT` (`6558` or whatever you set)
- `api.volowifi.com` → container `API_PORT`
- `socket.volowifi.com` → container `SOCKET_PORT`

### Required env

```env
NODE_ENV=production
TRUST_PROXY=1
DATABASE_URL=postgresql://...
SECRET_KEY=<random>
ALLOWED_ORIGINS=https://console.volowifi.com,https://captive.volowifi.com,...
PORT=6558
API_PORT=6557
SOCKET_PORT=6559
```

For managed Postgres: `DATABASE_SSL_MODE=require` and mount `ssl/ca-certificate-volo-private.crt`.

### After first deploy

```bash
npx prisma migrate deploy
# optional seed (staging only):
# npm run prisma:seed
```

### Firebase (push)

Do **not** rely on `production.json` / `staging.json` in the image (gitignored).

Set in Dokploy Environment:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Or mount a file and set `FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/firebase.json`.

If unset, the API still starts; push notifications are skipped with a warning.

### Production logs

Startup prints phase lines and a final `========== System Ready ==========` banner at `LOG_LEVEL=info` (default). Keep `LOG_LEVEL=info` (or omit it) in Dokploy so those lines appear in the Logs tab.

---

## 2. Frontend (`frontend/`)

| Setting | Value |
|---------|--------|
| Root directory | `frontend` |
| Build type | Nixpacks or Dockerfile |
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm start` |
| Health check | `GET /healthz` (Next liveness; login still uses `/health` → backend) |
| Container port | `4488` (or `PORT` env) |

### Domains (one frontend app, host-based routing in `next.config.mjs`)

| Host | App |
|------|-----|
| `console.volowifi.com` | Admin dashboard |
| `captive.volowifi.com` | Captive portal (`/auth`, `/dashboard`) |
| `partner.volowifi.com` | Partner PWA (`/partner`) |
| `collector.volowifi.com` | Collector PWA |
| `customer.volowifi.com` | Customer PWA |

Point all hosts to the **same** frontend Dokploy service (port `4488`).

`portal-v2.volowifi.com` is an alternate captive frontend host — it must use the
same `CAPTIVE_API_URL` (API app `…/api`, **not** console `…/console`).

### Build-time env (set once — `NEXT_PUBLIC_*` are auto-mirrored)

```env
# Browser / Cloudflare public host
NEXT_PUBLIC_API_URL=https://cpanal-api.volowifi.com/console
API_URL=https://cpanal-api.volowifi.com/console

# Next.js server must NOT call Cloudflare. Use the backend Docker service + PORT.
# Example: app name volowifi-backend-zouugw, PORT=6558 (or 4458 if that is what you set).
INTERNAL_API_URL=http://volowifi-backend-zouugw:6558/console
CAPTIVE_API_URL=http://volowifi-backend-zouugw:6557/api

SOCKET_URL=https://cpanal-socket.volowifi.com
SOCKET_PATH=/general/socket.io
CACHE_PREFIX=volo-wifi
BY_PASS=false
CAPTIVE_HOST=captive.volowifi.com
PARTNER_HOST=partner.volowifi.com
COLLECTOR_HOST=collector.volowifi.com
CUSTOMER_HOST=customer.volowifi.com
```

`INTERNAL_API_URL` is required on Dokploy. If it is missing, the frontend container tries `https://…volowifi.com` (Cloudflare `104.21.*` / `172.67.*`) and logs `UND_ERR_CONNECT_TIMEOUT`.

Join frontend and backend to the **same Docker network**. The hostname is the backend app/service name; the port is the backend `PORT` env (not 443).

If `CAPTIVE_API_URL` is omitted, it is derived by rewriting `API_URL`’s `/console` → `/api` on the **same host**. That only works when the console process also mounts captive routes at `/api` (current backend does). Prefer an explicit API host in production. Use the **internal** host/port (`API_PORT`) for `CAPTIVE_API_URL` on Dokploy.

Login from the portal posts to `/portal-api/login` (Next proxy) → `{CAPTIVE_API_URL}/login` (e.g. `https://api.volowifi.com/api/login`). Seeing **Route not found** on Connect almost always means this upstream URL is wrong or the API/captive routes are not deployed.

### CORS

Backend `ALLOWED_ORIGINS` must include every HTTPS origin the browser uses (console + captive + partner + mobile subdomains).

---

## Common mistakes

1. **Wrong root directory** — build fails with `ENOENT package.json` if root is repo root.
2. **yarn on frontend** — use `npm ci` (project has `package-lock.json`).
3. **Missing `TRUST_PROXY=1`** on backend behind Dokploy/Traefik — wrong client IP and cookies.
4. **Rebuilding frontend without `API_URL` / `SOCKET_URL`** — client bundle gets empty endpoints (NEXT_PUBLIC_* are mirrored from these at build).
5. **Committing Firebase JSON** — GitHub blocks push; use mounted secrets in Dokploy.
6. **Backend `PORT` ≠ Dokploy domain port** — health and login fail with 502. Use `6558/6557/6559` (docs) or change the domain target to match `4458/4457/4459`.
7. **Dokploy backend health path** — must be `GET /console/health` (not `/health` on the public console host, which is the frontend).
8. **Frontend `INTERNAL_API_URL` missing** — Next.js server-side `/health` and login call Cloudflare and time out (`UND_ERR_CONNECT_TIMEOUT`). Set `INTERNAL_API_URL=http://<backend-app>:<PORT>/console`.
9. **Failed to find Server Action** — stale HTML after a deploy (Cloudflare/browser cache). Hard-refresh the login page.

---

## Optional: Docker build

```bash
# Backend
docker build -t volo-backend ./backend

# Frontend (pass build args for NEXT_PUBLIC_*)
docker build -t volo-frontend ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://console.volowifi.com/console
```
