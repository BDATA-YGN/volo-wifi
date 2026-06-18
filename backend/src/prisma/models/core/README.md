# Core Models

Generic, reusable models that should travel with the codebase regardless of
domain (HR, EV console, etc.).

| File                       | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `admin.prisma`             | `Admin`, `AdminToken`, `MngRoles`, `MngRoleSettings`, `MapRoleSettings` |
| `audit-communication.prisma` | `AuditLog`, `Conversation`, `Message`                            |
| `file-job.prisma`          | `FileLog` (file/folder metadata + uploads)                         |
| `logs.prisma`              | `RegisterLog`, `LoginLog`                                          |
| `menu.prisma`              | `MenuGroup`, `MenuItem`                                            |
| `notification.prisma`      | Notification templates, recipients, channels, user settings        |
| `printers.prisma`          | `Printers`                                                         |
| `settings.prisma`          | `AppSetting` (and legacy `Settings`, `Otp`, `Dir`, `Databases`)    |
| `translation-theme.prisma` | `Translation`, `Theme`                                             |

Rule: **never** add forward relations from these models to anything in `hr/`.
HR back-relations are tolerated but MUST sit inside `-- HR module --` comment
markers so they can be stripped when the HR folder is removed.
