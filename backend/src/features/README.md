# Backend features layout

Folder names mirror `frontend/src/features` so console UI and API stay aligned.

## `core/`

| Folder | HTTP prefix (unchanged) | Frontend |
|--------|-------------------------|----------|
| `auth/` | `/auth` | `core/auth` |
| `menuManagement/` | `/menus` | `core/menuManagement` |
| `permissions/` | `/menu-permission` | `core/permissions` |
| `themeBuilder/` | `/themes` | `core/themeBuilder` |
| `receiptEditor/` | `/receipts` | `core/receiptEditor` |
| `printers/` | `/printers` | `core/printers` |
| `translations/` | `/translations` | `core/translations` |
| `settings/` | (service only) | `core/settings` |
| `contentEditor/` | (static content helper) | `core/contentEditor` |
| `database/` | `/database` | — (dev tooling) |

## `system/`

| Folder | HTTP prefix | Frontend |
|--------|-------------|----------|
| `admin-users/` | `/admin` | `system/admin-users` |
| `app-setting/` | `/app-setting` | `system/app-setting` |
| `audit-logs/` | `/audit` | `system/audit-logs` |
| `conversations/` | `/conversations` | `system/conversations` |
| `files/upload/` | `/upload` | `system/files` |
| `files/filelog/` | `/filelog` | `system/files` |
| `files/minio/` | `/storage/minio` | `system/files` |
| `files/proxy.route.ts` | proxy routes | `system/files` |
| `notifications/` | (if mounted) | — |

## Notes

- **API paths are not renamed** — only filesystem paths changed; clients keep working.
- **`system/admin-roles`**: UI lives under `frontend/.../admin-roles`; roles API is still `core/permissions` (`/menu-permission`).
- **`system/contacts`**: frontend-only for now (settings-backed contacts).
- **`_archive/`**: removed client/mobile/HR stubs and unused admin helpers.
