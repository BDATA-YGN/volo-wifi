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
| Health check | `GET /console/health` |

### Ports (one container, three listeners)

| Env | Default | Use |
|-----|---------|-----|
| `PORT` | 6558 | Console API (`/console/*`) |
| `API_PORT` | 6557 | Captive portal API (`/api/*`) |
| `SOCKET_PORT` | 6559 | Socket.IO (`/general/socket.io`) |

In Dokploy, create **three domains** (or path-based proxy) pointing to the same service on ports **6558**, **6557**, and **6559**.

Example:

- `console.volowifi.com` → container port `6558`
- `api.volowifi.com` → container port `6557`
- `socket.volowifi.com` → container port `6559`

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
| Health check | `GET /health` |
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

### Build-time env (set once — `NEXT_PUBLIC_*` are auto-mirrored)

```env
API_URL=https://console.volowifi.com/console
CAPTIVE_API_URL=https://api.volowifi.com/api
SOCKET_URL=https://socket.volowifi.com
SOCKET_PATH=/general/socket.io
CACHE_PREFIX=volo-wifi
BY_PASS=false
CAPTIVE_HOST=captive.volowifi.com
PARTNER_HOST=partner.volowifi.com
COLLECTOR_HOST=collector.volowifi.com
CUSTOMER_HOST=customer.volowifi.com
# Optional legacy CDN rewrites only — skip when using backend MinIO/S3:
# FILE_SERVER_URL=https://cdn.volowifi.com/public
# HOST_NAME=console.volowifi.com
```

Do **not** duplicate `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_PARTNER_HOST` unless you need a different public value. `frontend/env/apply-defaults.mjs` fills them from the keys above at build time.

### CORS

Backend `ALLOWED_ORIGINS` must include every HTTPS origin the browser uses (console + captive + partner + mobile subdomains).

---

## Common mistakes

1. **Wrong root directory** — build fails with `ENOENT package.json` if root is repo root.
2. **yarn on frontend** — use `npm ci` (project has `package-lock.json`).
3. **Missing `TRUST_PROXY=1`** on backend behind Dokploy/Traefik — wrong client IP and cookies.
4. **Rebuilding frontend without `API_URL` / `SOCKET_URL`** — client bundle gets empty endpoints (NEXT_PUBLIC_* are mirrored from these at build).
5. **Committing Firebase JSON** — GitHub blocks push; use mounted secrets in Dokploy.

---

## Optional: Docker build

```bash
# Backend
docker build -t volo-backend ./backend

# Frontend (pass build args for NEXT_PUBLIC_*)
docker build -t volo-frontend ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://console.volowifi.com/console
```
