-- Site Network: NAS MAC for Ruijie nas_mac site-lock matching.
-- Live wf_station uses camelCase for NAS hint columns (nasIdentifier, radiusClientIp, …).
ALTER TABLE "wf_station" ADD COLUMN IF NOT EXISTS "nasMac" TEXT;

-- Migrate accidental snake_case column from earlier apply, if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wf_station' AND column_name = 'nas_mac'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wf_station' AND column_name = 'nasMac'
  ) THEN
    ALTER TABLE "wf_station" RENAME COLUMN "nas_mac" TO "nasMac";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wf_station' AND column_name = 'nas_mac'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wf_station' AND column_name = 'nasMac'
  ) THEN
    ALTER TABLE "wf_station" DROP COLUMN "nas_mac";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wf_station__org_id__nas_identifier"
  ON "wf_station"("org_id", "nasIdentifier");

CREATE INDEX IF NOT EXISTS "idx_wf_station__org_id__radius_client_ip"
  ON "wf_station"("org_id", "radiusClientIp");

CREATE INDEX IF NOT EXISTS "idx_wf_station__org_id__nas_mac"
  ON "wf_station"("org_id", "nasMac");
