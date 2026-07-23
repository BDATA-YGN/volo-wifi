-- Township name stored as plain string on sites (no FK to places).
ALTER TABLE "wf_station" ADD COLUMN IF NOT EXISTS "township" TEXT;

CREATE INDEX IF NOT EXISTS "idx_wf_station__org_id__township"
  ON "wf_station"("org_id", "township");
