-- Capacity-tier token usage scope for captive portal site-lock (SITE | TIER | ALL).
-- Default ALL preserves existing cross-site login behavior.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StationTokenUsageScope') THEN
    CREATE TYPE "StationTokenUsageScope" AS ENUM ('SITE', 'TIER', 'ALL');
  END IF;
END $$;

ALTER TABLE "wf_station_size"
  ADD COLUMN IF NOT EXISTS "token_usage_scope" "StationTokenUsageScope" NOT NULL DEFAULT 'ALL';
