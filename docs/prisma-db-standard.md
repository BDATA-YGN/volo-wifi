## BDATA Standard — Prisma + Portable Database Guidelines

Goal: use Prisma in a way that can **switch database providers** (PostgreSQL / MySQL / SQL Server / SQLite) with minimal schema rewrites and minimal vendor-specific behavior.

This standard defines:

- **Naming conventions** (Prisma vs physical DB)
- **Portable data types**
- **Relations, indexes, constraints**
- **Migrations**
- **Security, connections, and operations** (mandatory)
- **Provider-specific escape hatches** (when unavoidable)

---

## 1) Naming conventions (required)

### Prisma layer (code-facing)

- **Prisma model**: `PascalCase` singular  
  Example: `User`, `OrganizationMember`, `BookingContainerLine`
- **Prisma field**: `camelCase`  
  Example: `createdAt`, `passwordHash`, `organizationId`
- **Prisma enum** (if used): `PascalCase` with `SCREAMING_SNAKE_CASE` members (portable *only if* provider supports native enums)  
  Example: `enum BookingStatus { DRAFT SUBMITTED APPROVED }`

### Database layer (physical names)

BDATA standard is **snake_case** for tables and columns.

- **Table names**: `snake_case` plural  
  Example: `users`, `organization_members`, `booking_container_lines`
- **Column names**: `snake_case`  
  Example: `created_at`, `password_hash`, `organization_id`

### Mapping rule (required)

Keep Prisma client ergonomic (camelCase) but keep the physical database consistent (snake_case) using Prisma mapping:

```prisma
model OrganizationMember {
  id             BigInt   @id @default(autoincrement()) @map("id")
  organizationId BigInt   @map("organization_id")
  userId         BigInt   @map("user_id")
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("organization_members")
  @@index([organizationId], map: "idx_organization_members__organization_id")
  @@index([userId], map: "idx_organization_members__user_id")
  @@unique([organizationId, userId], map: "uq_organization_members__organization_id__user_id")
}
```

- **Rule**: Do **not** use snake_case in Prisma field names. Use `@map`/`@@map` instead.
- **Rule**: Always set `@@map("...")` for every model (no exceptions) so physical names are stable.
- **Rule**: Always set `@map("...")` for every field (recommended) or at least for any field where a future rename could be costly/confusing.

---

## 2) Primary keys (portable defaults)

Choose one strategy per system (don’t mix randomly).

### Option A (recommended for most BDATA transactional systems): numeric identity

- **Use**: `BigInt @id @default(autoincrement())`
- **Pros**: portable across major relational DBs; compact indexes; good join performance
- **Cons**: harder for offline/distributed ID generation

```prisma
model User {
  id        BigInt   @id @default(autoincrement()) @map("id")
  email     String   @unique @map("email")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

### Option B: globally unique string IDs (when you need distributed creation)

- **Use**: `String @id @default(cuid())`
- **Pros**: create IDs client-side; safer for merges and multi-region
- **Cons**: larger indexes; may reduce performance vs numeric IDs

```prisma
model FileObject {
  id        String   @id @default(cuid()) @map("id")
  key       String   @unique @map("key")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("file_objects")
}
```

**Rule**: If you pick Option B, avoid provider-specific UUID types (`@db.Uuid`) because that breaks portability.

---

## 3) Portable data types (required)

### Use these Prisma types by default

- **Text**: `String` (keep length limits in app validation; don’t overfit DB-specific lengths)
- **Booleans**: `Boolean`
- **Integers**: `Int` or `BigInt`
- **Money/precision**: `Decimal` (do not use `Float` for money)
- **Time**: `DateTime` (always store in UTC in the application contract)
- **Binary**: `Bytes` (only if you truly store binary in DB; otherwise store object storage keys)

### Avoid provider-specific `@db.*` unless required

Provider-specific annotations reduce portability. Use them only when there is a clear need:

- very large text (`NVARCHAR(MAX)` / `TEXT`) requirements
- fixed precision decimals with specific scale/precision requirements
- special indexing limits

**Rule**: If you add any `@db.*`, document why and list the portability impact in the model block.

---

## 4) Enums and “code tables” (portable approach)

Native enums differ by provider (and some providers don’t support them well through Prisma). For portability:

### Standard approach: store “enum” values as strings

- Use `String` columns for status/role/type codes
- Validate allowed values in application code (and optionally with DB check constraints if you manage per-provider SQL)

```prisma
model Booking {
  id     BigInt  @id @default(autoincrement()) @map("id")
  status String  @map("status") // allowed: DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|CONFIRMED|CANCELLED

  @@map("bookings")
  @@index([status], map: "idx_bookings__status")
}
```

**Rule**: Use **SCREAMING_SNAKE_CASE** values for stored codes (e.g. `PENDING_APPROVAL`, `LANDED_CONFIRMED`).

### When to use Prisma `enum`

Only if:

- you know the provider set is stable, and
- you confirm all target providers support the enum semantics you need.

Otherwise, treat enums as strings.

---

## 5) JSON and semi-structured data (portable approach)

Because JSON support differs by provider:

- **Preferred**: normalize into relational tables when it is queryable/business-critical.
- **Fallback**: store JSON as `String` and parse/stringify in application code.

**Rule**: Don’t depend on database JSON operators in portable systems.

---

## 6) Relations + referential actions (portable)

- **Always** define relations explicitly with clear FK fields (`organizationId`, `userId`, etc.).
- Prefer **restrict/no action** semantics to avoid provider differences and cycle problems.

```prisma
model OrganizationMember {
  id             BigInt        @id @default(autoincrement()) @map("id")
  organizationId BigInt        @map("organization_id")
  userId         BigInt        @map("user_id")
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user           User          @relation(fields: [userId], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("organization_members")
}
```

**Rule**: Any cascade behavior must be implemented in application services/jobs unless you have a strong reason and have verified portability.

---

## 7) Indexes and constraints (required)

### Always define indexes explicitly

- Add indexes for foreign keys, common filters, and ordering keys.
- Use `map:` to give stable names (important for DB portability + long-lived migrations).

```prisma
@@index([createdAt], map: "idx_users__created_at")
@@unique([email], map: "uq_users__email")
```

**Naming standard**

- Index: `idx_<table>__<col1>__<col2>`
- Unique: `uq_<table>__<col1>__<col2>`
- Primary key (DB-generated name is OK; Prisma manages it)

---

## 8) Timestamps and soft-delete (standard patterns)

### Timestamps (recommended)

- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Map them to snake_case columns and index if frequently queried.

### Soft delete (when required)

- Use `deletedAt DateTime?` (nullable timestamp)
- **Rule**: application queries must consistently filter out deleted rows (centralize this behavior in repository/service layer).

---

## 9) Migrations (required)

- Use **Prisma Migrate** as the source of truth.
- **Do not** edit generated migration SQL by hand unless you also document provider differences and testing steps.
- **Do not** rely on DB-specific features in migrations (computed columns, filtered indexes, partial indexes, triggers) unless you commit to maintaining per-provider scripts.

**Rule**: Any raw SQL migration must include:

- the reason it’s needed
- the target providers it supports
- the rollback strategy

---

## 10) Additional mandatory rules (security, connections, operations)

These rules apply to **every** BDATA service that uses Prisma, in addition to the sections above.

### Security and raw SQL

- **Rule**: Never build SQL with string concatenation or template literals that embed user input. Use Prisma’s query API, or **`prisma.$queryRaw` / `$executeRaw` with tagged templates** (`Prisma.sql` / `Prisma.join`) so values are parameterized.
- **Rule**: Treat **`$queryRawUnsafe` / `$executeRawUnsafe`** as **forbidden in application code** unless a maintainer documents an exceptional one-off (e.g. emergency ops script) and it is reviewed.
- **Rule**: Do not store secrets (API keys, SMTP passwords, private keys) in the database `settings` table or any Prisma model. Use environment variables, a secret manager, or a dedicated vault integration.

### Connection URLs and pooling

- **Rule**: **`DATABASE_URL`** is the only supported way to configure the datasource URL in deployed environments (no hard-coded hosts in code).
- **Rule**: If you use a **connection pooler** (PgBouncer transaction mode, RDS Proxy, etc.), validate that Prisma’s connection limits and pooler settings match the [Prisma connection pool documentation](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management) for your deployment model (long-lived server vs serverless).
- **Rule**: When migrations need a **direct** DB connection (bypassing poolers that break migrations), use Prisma’s supported pattern: `directUrl` in `schema.prisma` for `migrate` / `db push`, and `url` for the runtime app—**only if** your Prisma version and provider support it; document both URLs in the project README / runbook.

### Transactions and consistency

- **Rule**: Multi-step writes that must succeed or fail together **must** run in a **`prisma.$transaction`** (interactive transaction when you need earlier reads to influence later writes).
- **Rule**: Do not rely on “best effort” ordering across multiple HTTP handlers or queue workers without an explicit idempotency or outbox pattern for side effects.

### Join tables and many-to-many

- **Rule**: Prefer an **explicit join model** (with its own `id`, `createdAt`, and future attributes) instead of Prisma’s implicit many-to-many **when** the relationship might ever need metadata (role, sort order, audit, effective dates).

### API and serialization (especially `BigInt`)

- **Rule**: **`BigInt` is not JSON-serializable** in standard `JSON.stringify`. If you expose numeric IDs as JSON, convert them in a controlled layer (e.g. `String(id)` or a bigint-safe serializer) and document the API contract so clients do not mix number and string types inconsistently.

### Timezones and locales

- **Rule**: Persist **`DateTime` in UTC**. Convert to local time only at the UI or reporting boundary.
- **Rule**: Do not persist “floating” local clock times without a timezone rule unless the domain truly is calendar-date-only; for date-only concepts, prefer explicit `DateTime` at UTC midnight **or** separate date fields—pick one approach per domain and document it.

### Character set and collation (when you control the DB)

- **Rule**: For MySQL/MariaDB, default to **`utf8mb4`** with a collation appropriate for your language requirements. For PostgreSQL, use UTF-8 and be explicit about case/sort needs where identifiers or natural keys are compared.
- **Rule**: Avoid relying on **case-insensitive** unique constraints unless you have verified the same behavior on every target provider you support.

### Observability and failures

- **Rule**: Log Prisma errors with **request correlation IDs**, not with full SQL parameters that may contain PII.
- **Rule**: On migration failure in production, follow a **documented runbook** (restore, forward-fix, or repair) rather than ad-hoc schema edits.

### CI and schema hygiene

- **`npx prisma validate`** must pass in CI for every PR that touches `schema.prisma` or migrations.
- **Rule**: Generated Prisma Client output (`node_modules/.prisma`, etc.) is not a source of truth—**the schema and migrations are**.

### Seeds and local data

- **Rule**: Seeds must be **idempotent** (safe to run twice) or guarded by environment checks so they cannot corrupt production accidentally.
- **Rule**: Never ship seeds that insert production-like PII; use synthetic fixtures.

### Optional but recommended: optimistic locking

- For hot rows updated concurrently, consider **`version Int @default(0)`** (mapped column) and increment on each update; reject stale writes in the application layer.

---

## 11) Provider portability checklist (PR gate)

When adding/changing models:

- **Naming**: models PascalCase, fields camelCase; physical names snake_case via `@map`/`@@map`
- **Types**: avoid `@db.*` unless necessary; avoid `Unsupported(...)`
- **Enums**: prefer `String` codes + app validation
- **JSON**: don’t depend on JSON operators; normalize or store as string
- **Relations**: avoid cascades by default; ensure FK indexes exist
- **Indexes**: explicit `@@index` / `@@unique` with `map:` names
- **Migrations**: no manual drift; migrations replay cleanly on a fresh DB
- **Security**: no unsafe raw SQL; no secrets in DB settings
- **Transactions**: multi-step writes use `$transaction` where required
- **BigInt JSON**: API layer handles serialization explicitly
- **CI**: `prisma validate` passes

---

## 12) Practical examples (copy/paste templates)

### A join table with portable constraints

```prisma
model User {
  id    BigInt  @id @default(autoincrement()) @map("id")
  email String  @unique(map: "uq_users__email") @map("email")

  members OrganizationMember[]

  @@map("users")
}

model Organization {
  id      BigInt  @id @default(autoincrement()) @map("id")
  name    String  @map("name")
  members OrganizationMember[]

  @@map("organizations")
}

model OrganizationMember {
  id             BigInt       @id @default(autoincrement()) @map("id")
  organizationId BigInt       @map("organization_id")
  userId         BigInt       @map("user_id")
  role           String       @map("role") // ORG_OWNER|ORG_ADMIN|MEMBER
  createdAt      DateTime     @default(now()) @map("created_at")

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  user           User         @relation(fields: [userId], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@map("organization_members")
  @@unique([organizationId, userId], map: "uq_organization_members__organization_id__user_id")
  @@index([organizationId], map: "idx_organization_members__organization_id")
  @@index([userId], map: "idx_organization_members__user_id")
}
```

---
