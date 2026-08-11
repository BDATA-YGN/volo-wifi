# Cron jobs

Scheduled background tasks that run inside the API process.

Bootstrapped from `server.ts` after the database, services, and HTTP listeners
are ready (`initializeCronJobs()` → `startAllJobs()`).

## Current jobs

| Job | Default schedule | Purpose |
|-----|------------------|---------|
| `log-cleanup` | `0 3 * * *` daily | Purges expired audit and login logs |
| `credential-sync` | `*/3 * * * *` every 3 min | Closes stale RADIUS sessions; marks tokens `CONSUMED` / `EXPIRED`; refreshes `timeRemainingSec` |
| `reporting-aggregate` | `15 * * * *` hourly | Builds `rpt_daily_*` stat tables from operational data |
| `reporting-aggregate` | `30 2 1 * *` monthly | Rolls daily → monthly → yearly sales stats |
| `ops-archive` | `30 4 * * *` daily | Archives/purges operational tables (see below) |

All schedules and retention values are configurable via **App Settings** (`ops` category).

## Operational vs reporting tables

| Layer | Tables | Strategy |
|-------|--------|----------|
| **Operational (hot)** | `wf_credential`, `wf_captive_portal_session`, `wf_radius_session`, `wf_sale_order`, `wf_sale_item`, `wf_payment` | Archive or purge by entity policy |
| **Reporting (aggregated)** | `rpt_daily_sales_stat`, `rpt_daily_radius_usage_stat`, `rpt_monthly_sales_stat`, `rpt_yearly_sales_stat` | Rebuilt by aggregate job; daily rows purged after ~3 years (no archive) |

## Operational retention policy (defaults)

| Entity | Hot retention | Archive | Notes |
|--------|---------------|---------|-------|
| **Credential** | Until terminal + **7 days** | `wf_credential_archive` ~7 yr | Only `EXPIRED`, `CONSUMED`, `REVOKED`; skips if RADIUS session still active |
| **CaptivePortalSession** | **14 days** | None (purge) | Short-lived NAS redirect state |
| **RadiusSession** | **30 days** (stopped) | `wf_radius_session_archive` ~2 yr | Largest growth table |
| **SaleOrder** (closed) | **180 days** | `wf_sale_order_archive` ~7 yr | Items + payments embedded in JSON payload |
| **SaleOrder** (DRAFT) | **30 days** | None (purge) | Abandoned drafts |
| **Daily stats** | **1095 days** | None (purge) | Monthly/yearly rollups kept longer |

## Archive execution order

Each `ops-archive` tick runs in dependency order:

1. Archive stopped RADIUS sessions
2. Purge captive portal sessions
3. Archive terminal credentials
4. Archive closed sale orders; purge old drafts
5. Purge old daily stat rows (reporting layer)
6. Purge expired rows from archive tables

## Manual run (development)

```ts
import {
  runReportingAggregateTick,
  runReportingRollupTick,
  runOpsArchiveTick,
  runCredentialSyncTick,
} from '@/jobs';

await runCredentialSyncTick();
await runReportingAggregateTick();
await runReportingRollupTick();
await runOpsArchiveTick();
```

After schema changes, run `yarn prisma:migrate` to apply archive tables.
