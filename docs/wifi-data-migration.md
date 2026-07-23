# WiFi data migration (volo-api-console → volo-wifi)

Migrate live WiFi business data from the old **volo-api-console** PostgreSQL into this repo’s database.

## Scope (v1)

**Included:** Org, admins (referenced), OrgLicense (synthesized), OrgMember roles, Reseller (+ entitlements / ResellerStation), WifiStation (+ default StationSize), StationDevice, Plan / price books / prices, VoucherBatch, Credential, SaleOrder / SaleItem / Payment, CommissionRule / CommissionPayout.

**Excluded:** RadiusSession, audit logs, reporting stats, SaaS invoice history, Agent table (`agentId` dropped).

## Three phases (verify before continuing)

| Phase | What it imports | Verify after |
|------|-----------------|--------------|
| **1** | Admins, Org, OrgLicense, Resellers, Stations/Devices, OrgMember roles, Plans/prices, entitlements | Console: org, sites, plans, partners |
| **2** | VoucherBatch, Credential | Sample voucher login / token lookup |
| **3** | SaleOrder, SaleItem, Payment, commissions | Recent sale + payment totals |

Always finish and check phase *N* before running phase *N+1*.

## Prerequisites

1. NEW database migrated (`yarn prisma:deploy`) with roles + station capacity tiers seeded (`yarn seed` or at least role settings + `StationSize`).
2. `DATABASE_URL` points at the NEW (target) database.
3. `OLD_DATABASE_URL` points at the live OLD volo-api-console database (read-only usage).
4. Prefer a staging clone of NEW first (`yarn db:clone`).

## Configure

In `backend/.env`:

```bash
OLD_DATABASE_URL=postgresql://.../volo_db?...
OLD_DATABASE_SSL_MODE=require   # optional; falls back to DATABASE_SSL_MODE / auto
```

## Dry-run

```bash
cd backend
yarn data:wifi:migrate:dry -- --phase=1 --org=AA
yarn data:wifi:migrate:dry -- --phase=2 --org=AA
yarn data:wifi:migrate:dry -- --phase=3 --org=AA
```

Omit `--phase` to preview all phases. Writes JSON under `backend/tmp/wifi-migrate-*.json`.

## Apply (gated)

```bash
cd backend
yarn data:wifi:migrate -- --apply --i-understand --phase=1 --org=AA
# verify phase 1 in the console, then:
yarn data:wifi:migrate -- --apply --i-understand --phase=2 --org=AA
# verify vouchers, then:
yarn data:wifi:migrate -- --apply --i-understand --phase=3 --org=AA
```

`--apply` without `--i-understand` is refused. Upsert is by `id` (idempotent).

## Weekly / delta catch-up (`--since`)

After a baseline, re-run only changed rows:

```bash
# date is inclusive, UTC midnight for YYYY-MM-DD
yarn data:wifi:migrate -- --apply --i-understand --phase=1 --since=2026-07-22 --org=AA
yarn data:wifi:migrate -- --apply --i-understand --phase=2 --since=2026-07-22 --org=AA
yarn data:wifi:migrate -- --apply --i-understand --phase=3 --since=2026-07-22 --org=AA
```

`--since` keeps rows where `updatedAt` **or** `createdAt` (or `paidAt` for payments) is `>=` the timestamp. Phase 1 membership rebuild stays full (cheap).

## Reset migrated data (re-run migrate)

Deletes one org and related WiFi rows from **NEW** only (keeps platform seed admin / capacity tiers):

```bash
cd backend
yarn data:wifi:migrate:reset -- --org=AA --i-understand
```

Then re-run phases 1→2→3 as needed.


1. Baseline: phases 1→2→3 on staging, verify each.
2. Optional weekly deltas with `--since=…`.
3. Freeze OLD writes (or accept a short gap) → final `--apply` per phase (full or `--since` from last sync).
4. Spot-check stations/plans, voucher token, recent sale.
5. Point apps / FreeRADIUS at NEW (sessions not imported in v1).

## Implementation

- CLI: [`backend/tools/migrate-from-volo-api-console.ts`](../backend/tools/migrate-from-volo-api-console.ts)
- Logic: [`backend/src/prisma/data/migrate-from-volo/`](../backend/src/prisma/data/migrate-from-volo/)
