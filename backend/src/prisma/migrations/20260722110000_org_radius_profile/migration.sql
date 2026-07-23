-- Org-scoped RADIUS profiles (shared secret / server) selectable by NAS devices.
CREATE TABLE IF NOT EXISTS "wf_org_radius_profile" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shared_secret" TEXT NOT NULL,
  "server_host" TEXT,
  "nas_type" TEXT NOT NULL DEFAULT 'other',
  "nas_ports" INTEGER,
  "community" TEXT,
  "note" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source_station_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "wf_org_radius_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_wf_org_radius_profile__org_id__name"
  ON "wf_org_radius_profile" ("org_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "wf_org_radius_profile_source_station_id_key"
  ON "wf_org_radius_profile" ("source_station_id");

CREATE INDEX IF NOT EXISTS "idx_wf_org_radius_profile__org_id__deleted_at"
  ON "wf_org_radius_profile" ("org_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "idx_wf_org_radius_profile__org_id__is_active"
  ON "wf_org_radius_profile" ("org_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_org_radius_profile_org_id_fkey'
  ) THEN
    ALTER TABLE "wf_org_radius_profile"
      ADD CONSTRAINT "wf_org_radius_profile_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "wf_org"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_org_radius_profile_source_station_id_fkey'
  ) THEN
    ALTER TABLE "wf_org_radius_profile"
      ADD CONSTRAINT "wf_org_radius_profile_source_station_id_fkey"
      FOREIGN KEY ("source_station_id") REFERENCES "wf_station"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "wf_station_device"
  ADD COLUMN IF NOT EXISTS "radius_profile_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_wf_station_device__radius_profile_id"
  ON "wf_station_device" ("radius_profile_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_station_device_radius_profile_id_fkey'
  ) THEN
    ALTER TABLE "wf_station_device"
      ADD CONSTRAINT "wf_station_device_radius_profile_id_fkey"
      FOREIGN KEY ("radius_profile_id") REFERENCES "wf_org_radius_profile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
