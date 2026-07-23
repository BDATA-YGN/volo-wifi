-- Station plan sellability allow-list + optional capacity-tier scoped price books.

CREATE TABLE IF NOT EXISTS "wf_station_plan_offer" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "station_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wf_station_plan_offer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_wf_station_plan_offer__station_id__plan_id"
  ON "wf_station_plan_offer"("station_id", "plan_id");

CREATE INDEX IF NOT EXISTS "idx_wf_station_plan_offer__org_id__station_id"
  ON "wf_station_plan_offer"("org_id", "station_id");

CREATE INDEX IF NOT EXISTS "idx_wf_station_plan_offer__org_id__plan_id"
  ON "wf_station_plan_offer"("org_id", "plan_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_station_plan_offer_org_id_fkey'
  ) THEN
    ALTER TABLE "wf_station_plan_offer"
      ADD CONSTRAINT "wf_station_plan_offer_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "wf_org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_station_plan_offer_station_id_fkey'
  ) THEN
    ALTER TABLE "wf_station_plan_offer"
      ADD CONSTRAINT "wf_station_plan_offer_station_id_fkey"
      FOREIGN KEY ("station_id") REFERENCES "wf_station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_station_plan_offer_plan_id_fkey'
  ) THEN
    ALTER TABLE "wf_station_plan_offer"
      ADD CONSTRAINT "wf_station_plan_offer_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "wf_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "wf_plan_price_book"
  ADD COLUMN IF NOT EXISTS "station_size_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_station_size_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book"
      ADD CONSTRAINT "wf_plan_price_book_station_size_id_fkey"
      FOREIGN KEY ("station_size_id") REFERENCES "wf_station_size"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wf_plan_price_book__org_id__station_size_id"
  ON "wf_plan_price_book"("org_id", "station_size_id");
