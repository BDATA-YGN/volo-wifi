-- Add policy_bundle_id so one console policy can cover 0..N sites (attrs still denormalized per station for FreeRADIUS).
ALTER TABLE "wf_plan_radius_attribute"
  ADD COLUMN IF NOT EXISTS "policy_bundle_id" TEXT;

-- Backfill: one bundle per existing (org, plan, vendor, station) group.
WITH groups AS (
  SELECT
    "org_id",
    "plan_id",
    "vendor_profile_id",
    "wifi_station_id",
    gen_random_uuid()::text AS bundle_id
  FROM "wf_plan_radius_attribute"
  WHERE "deleted_at" IS NULL
    AND ("policy_bundle_id" IS NULL OR "policy_bundle_id" = '')
  GROUP BY "org_id", "plan_id", "vendor_profile_id", "wifi_station_id"
)
UPDATE "wf_plan_radius_attribute" a
SET "policy_bundle_id" = g.bundle_id
FROM groups g
WHERE a."org_id" = g."org_id"
  AND a."plan_id" = g."plan_id"
  AND a."vendor_profile_id" = g."vendor_profile_id"
  AND a."wifi_station_id" IS NOT DISTINCT FROM g."wifi_station_id"
  AND a."deleted_at" IS NULL
  AND (a."policy_bundle_id" IS NULL OR a."policy_bundle_id" = '');

-- Soft-deleted / any leftover rows still need a non-null value.
UPDATE "wf_plan_radius_attribute"
SET "policy_bundle_id" = gen_random_uuid()::text
WHERE "policy_bundle_id" IS NULL OR "policy_bundle_id" = '';

ALTER TABLE "wf_plan_radius_attribute"
  ALTER COLUMN "policy_bundle_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_wf_plan_radius_attribute__policy_bundle_id"
  ON "wf_plan_radius_attribute" ("policy_bundle_id");

CREATE INDEX IF NOT EXISTS "idx_wf_plan_radius_attr__org_bundle_del"
  ON "wf_plan_radius_attribute" ("org_id", "policy_bundle_id", "deleted_at");
