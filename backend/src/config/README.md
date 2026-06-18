# Backend configuration (`src/config`)

This directory defines the backend’s configuration model:
- loads environment variables from `.env`
- applies safe defaults (portable across machines)
- validates required configuration early during startup
- enables **feature-based configuration** (only validate what you enable)

## Design principles

- **Single source of truth**: feature modules read from `src/config/env.ts`, not `process.env` directly.
- **Portable defaults**: prefer project-relative paths such as `./storages/logs`.
- **Fail fast**: invalid config should fail during startup, before serving requests.
- **Feature toggles**: configuration requirements depend on whether a feature is turned on.

## Folder structure

- `env.ts`: loads `.env` and parses env vars (via `envalid`) into `env`
- `core.ts`: core config (ports, db, redis, cors, logging/backup dirs)
- `features/`: per-feature config + validation
  - `storage.ts`: local / MinIO / R2 / DO Spaces configuration
- `validate.ts`: `validateConfig()` (called once at startup)
- `index.ts`: public exports for the rest of the codebase (`@/config`)

## Startup flow

`src/server.ts` runs:
- existing project validation: `ValidateEnv()`
- config module validation: `validateConfig()`

Then storage is initialized on startup (local dir or remote connection check).

## Feature on/off guide

### Storage (local / MinIO / R2 / DigitalOcean Spaces)

**Local filesystem** (no remote credentials):

```env
STORAGE_ENABLED=false
STORAGE_LOCAL_DIR=./storages/uploads
```

**Remote S3-compatible**:

```env
STORAGE_ENABLED=true
STORAGE_PROVIDER=minio   # minio | r2 | do_spaces
STORAGE_ENDPOINT=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PUBLIC_BUCKET=public
STORAGE_PRIVATE_BUCKET=private
STORAGE_PUBLIC_BASE_URL=   # optional CDN URL
```

See `.env.example` for provider-specific commented examples.

When `STORAGE_ENABLED=false`:
- files are stored under `STORAGE_LOCAL_DIR/{bucket}/{key}`
- the `/:bucket/*` proxy route serves files from disk
- no remote credentials are required

## Environment variables: preferred vs legacy

### Preferred storage keys

Use `STORAGE_*` only. `MINIO_*` env vars were removed; code still exports `MINIO_PUBLIC_BUCKET` / `MINIO_PRIVATE_BUCKET` as aliases.

### Legacy keys (supported for now)

Some modules still rely on older names:
- `MEGA_*` folder path constants (content categories)

## Notes / common pitfalls

- **Minio endpoint format**
  - Minio expects a hostname/IP as `endPoint` (no protocol).
  - The config layer accepts `http://127.0.0.1` and normalizes it.

- **Paths**
  - Avoid machine-specific absolute paths.
  - Prefer `LOG_DIR=./storages/logs` and `DB_BACKUP=./storages/backups`.

