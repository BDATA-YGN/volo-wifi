# WiFi Domain Models

Volo WiFi station management schema (ported from `volo-api-console`).

## Files

| File | Contents |
|------|----------|
| `enums.prisma` | Domain enums (status, billing, RADIUS, etc.) |
| `org.prisma` | `Org`, `WifiAuditLog` |
| `membership.prisma` | `OrgMember`, roles, station scope, `ResellerStation` (internal provisioning only) |
| `reseller.prisma` | `Reseller`, `ResellerPlanEntitlement` |
| `station.prisma` | `WifiStation`, `StationDevice` |
| `plan.prisma` | `Plan`, `PlanPriceBook`, `PlanPrice` |
| `credential.prisma` | `Credential`, `CaptivePortalSession`, `VoucherBatch` |
| `sales.prisma` | `SaleOrder`, `SaleItem`, `Payment`, commission |
| `licensing.prisma` | `StationSize`, license pricing, org SaaS billing |
| `radius.prisma` | RADIUS sessions, vendor profiles, plan attributes |
| `reporting.prisma` | Pre-aggregated sales and usage stats |
| `finance-reporting.prisma` | Settlement, attestation, sealed postings |

## Cross-folder relations

WiFi models reference `Admin` from `core/admin.prisma`. Back-relations on `Admin` are delimited by `-- WiFi module back-relations --` markers so they can be removed when forking without WiFi.

## Regenerating from source

```bash
node scripts/transform-wifi-prisma.mjs \
  /path/to/volo-api-console/backend/src/prisma/models/volo.prisma \
  src/prisma/models/wifi
```

Then run `npx prisma validate`. Note: `membership.prisma`, `reseller.prisma`, and `licensing.prisma` size-tier models are maintained manually in this repo.
