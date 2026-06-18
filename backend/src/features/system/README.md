# System features

Mirrors `frontend/src/features/system`. See `../README.md` for the full frontend ↔ backend map.

| Folder | Routes |
|--------|--------|
| `admin-users/` | `/console/admin` |
| `app-setting/` | `/console/app-setting` |
| `audit-logs/` | `/console/audit` |
| `conversations/` | `/console/conversations` |
| `files/` | upload, filelog, minio, storage proxy |
| `admin-roles/` | (see README — API in `core/permissions`) |
| `contacts/` | (see README — via app-setting today) |

Register route classes in `server.ts`.
