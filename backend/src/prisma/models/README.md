# Prisma Models

Models are grouped by reusability so the HR domain can be removed cleanly when forking this codebase for a non-HR project.

```
models/
├── core/   # Reusable across projects (admin, menu, audit, settings, files, etc.)
├── wifi/   # Volo WiFi station management (org, plans, RADIUS, sales, reporting)
└── hr/     # HR-specific (employees, attendance, leave, payroll, ...)
```

## How Prisma discovers files

`prisma.config.ts` points `schema: 'src/prisma'`. Prisma 7's multi-file schema support
auto-discovers every `.prisma` file under that directory (including nested folders).

## Removing the HR module for a fork

1. Delete the entire `models/hr/` folder.
2. Remove the marked HR back-relations from `models/core/file-job.prisma`
   (`employeeDocuments`, `leaveAttachments`). They are delimited by
   `-- HR module back-relations --` comment markers.
3. Drop the HR-specific seed data references in `src/prisma/data/` if any.
4. Run `npx prisma generate` and `npx prisma migrate dev` to refresh the client.

## Cross-folder relations rule

`core/` models MUST NOT reference `hr/` models in their forward relations.
HR back-relations on core models (e.g. `FileLog.employeeDocuments`) MUST be
delimited by the comment markers shown above so they are easy to strip.
