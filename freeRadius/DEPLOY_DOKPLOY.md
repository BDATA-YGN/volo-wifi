# Deploy FreeRADIUS on Dokploy (from Git)

This guide covers what you need to deploy this repo on [Dokploy](https://dokploy.com) using a Git repository.

## 1. What you need before deploying

- **Dokploy** installed on a server (Docker installed; ports 80, 443, 3000 free).
- **Git repo** with this project (e.g. GitHub, GitLab, Gitea, Bitbucket).
- **PostgreSQL** reachable from the Dokploy server (your DB for `raddb/mods-available/sql`).  
  If you run PostgreSQL inside Dokploy, use a compose stack that exposes the DB and ensure the FreeRADIUS service can reach it (see network notes below).

## 2. Create the application in Dokploy

1. In Dokploy: **Project** → **Compose** → create new service.
2. **Compose type**: Docker Compose (not Stack).
3. **Source**: Git.
4. **Repository**: your repo URL (e.g. `https://github.com/your-org/freeRadius`).
5. **Branch**: e.g. `main`.
6. **Compose path**: `./docker-compose.yml`.
7. Save (e.g. **General** tab).

## 3. RadDB config and AutoDeploy (important)

Your `docker-compose.yml` mounts `./raddb` into the container. With **AutoDeploy** (webhook on git push), Dokploy does a fresh `git clone` on each deploy. The clone contains the latest `raddb` from Git, so the first deploy and later deploys will see the files from the repo.

- If you **do not** use AutoDeploy and only deploy manually, the same applies: the app runs from the cloned repo, so `./raddb` is correct.
- If you want **persistent custom config** that is not in Git (e.g. DB credentials, client secrets), use **File Mounts** so they are not overwritten by clone:
  1. **Advanced** → **Mounts**.
  2. Create a File Mount (e.g. copy your `raddb` or only the files you change).
  3. In `docker-compose.yml`, mount that path instead of `./raddb`, e.g. `../files/raddb:/etc/raddb` (Dokploy stores File Mounts under `../files/`).

So: for “deploy from Git as-is”, you don’t need to change the compose. For “persist custom raddb outside Git”, use File Mounts and change the volume to `../files/raddb`.

## 4. Database credentials (security)

`raddb/mods-available/sql` currently has DB connection settings (server, port, login, password, radius_db). Those are in Git, which is not ideal for production.

- **Option A – File Mount (recommended)**  
  Put only the SQL config (or the whole `raddb`) in a Dokploy File Mount and mount it over `/etc/raddb` (or the specific file). Then your real credentials are only in Dokploy, not in the repo.

- **Option B – Keep in Git**  
  If the repo is private and you accept credentials in Git, you can leave as-is. Prefer not to do this for production.

FreeRADIUS does not read env vars from the process environment for the SQL module config; credentials are in the config file. So the safe approach is to keep the file that contains credentials out of Git and provide it via File Mount.

### DigitalOcean Managed PostgreSQL (SSL)

The DO CA certificate is in the repo and deploys with `raddb`:

| Repo path | Container path |
|-----------|----------------|
| `raddb/certs/do-ca-certificate.crt` | `/etc/raddb/certs/do-ca-certificate.crt` |

`raddb/mods-available/sql` references it as:

```
sslrootcert=${confdir}/certs/do-ca-certificate.crt
```

Because `./raddb` is bind-mounted to `/etc/raddb`, **git push + redeploy is enough** — the cert is copied automatically. See `raddb/certs/DO-MANAGED-DB.md` for rotation and manual install.

Set your real DO host, user, password, and dbname in the `radius_db` connection string in `mods-available/sql` (or override via File Mount).

## 5. Network mode and ports

The compose uses `network_mode: "host"` so that RADIUS UDP (1812/1813) works simply. With host mode:

- The container shares the host network; `ports:` in the compose are ignored.
- Ensure the host (Dokploy server) has **1812/udp** and **1813/udp** free.
- If your PostgreSQL is on the same host or reachable by the host’s IP, connection from the container will work.

If you later run PostgreSQL in another Dokploy stack and need to use a Docker network instead of host:

- Remove `network_mode: "host"`.
- Add the same Docker network to both stacks (or use `dokploy-network` and connect the DB to it), and use the DB service name as `server` in the SQL config.

## 6. Optional: webhook for AutoDeploy

To deploy on every push:

1. In Dokploy, open your Compose application.
2. Find the **Webhook** URL (e.g. in **Deployments** or **General**).
3. In your Git provider (GitHub/GitLab/etc.), add a webhook that calls this URL on push.

After that, each push to the chosen branch will trigger a new deploy.

## 7. Checklist

- [ ] Dokploy installed; repo connected (Git URL, branch, compose path `./docker-compose.yml`).
- [ ] PostgreSQL reachable from the server (or from the host if using `network_mode: "host"`).
- [ ] If using host mode: ports 1812/udp and 1813/udp free on the host.
- [ ] DB credentials: either in a File Mount (recommended) or accepted as in-repo for non-production.
- [ ] Optional: webhook configured for AutoDeploy.
- [ ] First deploy: trigger deploy in Dokploy and check logs for “Listening on port 1812” and SQL connection (e.g. “Connected to database” or no “rlm_sql” errors).

## 8. Verify after deploy

- **Logs**: Dokploy → your application → **Logs**. Look for FreeRADIUS startup and SQL module messages.
- **RADIUS**: From another machine: `radtest user pass localhost 0 <shared_secret>` (use the actual client shared secret from `raddb/clients.conf` — if you generated new ones, see `LOCAL_SECRETS.md` in the repo root).

If you use File Mounts for `raddb`, ensure the mounted files have the same structure as the default `raddb` (sites-enabled, mods-enabled, etc.) so the server can start correctly.
