# Retail pricing redesign

## Do orders depend on retail pricing IDs?

**No.** Safe to reshape price books without rewriting historical sales.

| Table | Links to retail pricing? |
|-------|--------------------------|
| `wf_sale_order` | No — only org / reseller / station + totals |
| `wf_sale_item` | **`plan_id` only** + snapped `unit_price` / `line_total` |
| `wf_payment` | Order only |

Checkout resolves a live price from price books, then **copies** the amount onto the sale item. Changing or deleting a `PlanPrice` / `PlanPriceBook` later does not rewrite old orders.

## What’s wrong today (AA org)

- **84 site-scoped price books**, 0 org-default, 0 reseller books
- Only **~8 unique** (plan-set × price) signatures — massive duplication
- Opening a new shop currently implies another full price book copy
- Site books are doing **two jobs at once**: price *and* “which plans this site may sell”
- Capacity tier (`PAC` / `ID` / `APC`) does **not** map 1:1 to those plan sets (Medium alone has many different catalogs)

Reseller “which plans can this partner sell?” already exists as **`ResellerPlanEntitlement`** (Partners UI). Pricing and sellability should stay separate.

## Target model (recommended)

Split **price** from **catalog allow-list**:

```
Price resolution (most specific wins)
  1. Site price override book     (rare)
  2. Reseller price override book (partner-specific amounts)
  3. Capacity-tier price book     (optional: SMALL/MEDIUM/LARGE list prices)
  4. Org default price book       (canonical retail/cost per plan)

Sellability filters (AND)
  • ResellerPlanEntitlement     — partner may sell these plans
  • StationPlanOffer            — site may sell these plans
       empty for a site = all org active plans that have a resolvable price
  • Resolved price must exist
```

### Capacity tiers

Use **tier price books** for shared list prices (e.g. Medium sites share one MMK list), not one book per station.

Per-site differences that are only “which plans” belong in **`StationPlanOffer`**, not another full price matrix.

### UI

Select / read-only fields must show **`name (code)`**, never raw UUIDs.

## Consolidation plan for current AA data

1. **Backup** `wf_plan_price_book` + `wf_plan_price` → `backend/tmp/retail-pricing-backup-*.json`
2. Build **one org DEFAULT** book with modal prices per plan (from current site books):
   - P00 → 0, P01 → 2000, P02 → 0, P03 → 0 (majority) or keep outliers as site overrides, PLNA94 → 5000
3. For each former site book, write **StationPlanOffer** rows for that site’s plan set
4. Soft-delete redundant site price books (keep only true price outliers as site overrides)
5. Keep / add reseller books only when partner list prices differ

Expected shape after: **~1 default (+ optional tier/reseller/outlier site books)** instead of **84** site clones, with sellability preserved via offers + partner entitlements.

## Tooling

```bash
cd backend
# backup only
yarn data:retail-pricing:backup -- --org=AA

# dry-run consolidate (default)
yarn data:retail-pricing:consolidate -- --org=AA

# apply
yarn data:retail-pricing:consolidate -- --org=AA --apply --i-understand
```
