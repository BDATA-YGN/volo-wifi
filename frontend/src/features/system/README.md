# HR — system

Source: `backend/src/prisma/json/menu.json` (group id `107`).

## Menu items

- **/system/admin-users** — `menus.admin-users` (key: `/system/admin-users`)
- **/system/admin-roles** — `menus.admin-roles-permissions` (key: `/system/admin-roles`)
- **/system/employee-portal-access** — `menus.employee-portal-access` (key: `/system/employee-portal-access`)
- **/system/settings** — `menus.system-settings` (key: `/system/settings`)
- **/system/audit-logs** — `menus.audit-logs` (key: `/system/audit-logs`)
- **/system/files** — `menus.files` (key: `/system/files`)
- **/system/contact-support** — `menus.contact-support` (key: `/system/contact-support`)
- **/system/conversations** — `menus.conversations` (key: `/system/conversations`)

## Backend

Add REST (or tRPC) handlers under this folder when you implement the domain, e.g. `routes.ts` + `controller.ts`, and register the route class in `server.ts`.

Suggested API prefix: `/api/hr/system/...` (optional convention).

## Frontend

Implement screens and hooks under this folder (for example `console-admins/` for **Admin users**); keep `app/(dash)/system/...` routes as thin shells that import from here.
