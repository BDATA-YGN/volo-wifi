-- One price book → many stations / resellers (junction tables).

CREATE TABLE IF NOT EXISTS "wf_plan_price_book_station" (
  "id" TEXT NOT NULL,
  "price_book_id" TEXT NOT NULL,
  "station_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wf_plan_price_book_station_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wf_plan_price_book_reseller" (
  "id" TEXT NOT NULL,
  "price_book_id" TEXT NOT NULL,
  "reseller_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wf_plan_price_book_reseller_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_wf_plan_price_book_station__book_station"
  ON "wf_plan_price_book_station"("price_book_id", "station_id");
CREATE INDEX IF NOT EXISTS "idx_wf_plan_price_book_station__station_id"
  ON "wf_plan_price_book_station"("station_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_wf_plan_price_book_reseller__book_reseller"
  ON "wf_plan_price_book_reseller"("price_book_id", "reseller_id");
CREATE INDEX IF NOT EXISTS "idx_wf_plan_price_book_reseller__reseller_id"
  ON "wf_plan_price_book_reseller"("reseller_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_station_price_book_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book_station"
      ADD CONSTRAINT "wf_plan_price_book_station_price_book_id_fkey"
      FOREIGN KEY ("price_book_id") REFERENCES "wf_plan_price_book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_station_station_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book_station"
      ADD CONSTRAINT "wf_plan_price_book_station_station_id_fkey"
      FOREIGN KEY ("station_id") REFERENCES "wf_station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_reseller_price_book_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book_reseller"
      ADD CONSTRAINT "wf_plan_price_book_reseller_price_book_id_fkey"
      FOREIGN KEY ("price_book_id") REFERENCES "wf_plan_price_book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_reseller_reseller_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book_reseller"
      ADD CONSTRAINT "wf_plan_price_book_reseller_reseller_id_fkey"
      FOREIGN KEY ("reseller_id") REFERENCES "wf_reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill from legacy singular FKs (idempotent).
INSERT INTO "wf_plan_price_book_station" ("id", "price_book_id", "station_id", "created_at")
SELECT gen_random_uuid()::text, b."id", b."station_id", NOW()
FROM "wf_plan_price_book" b
WHERE b."station_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "wf_plan_price_book_station" j
    WHERE j."price_book_id" = b."id" AND j."station_id" = b."station_id"
  );

INSERT INTO "wf_plan_price_book_reseller" ("id", "price_book_id", "reseller_id", "created_at")
SELECT gen_random_uuid()::text, b."id", b."reseller_id", NOW()
FROM "wf_plan_price_book" b
WHERE b."reseller_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "wf_plan_price_book_reseller" j
    WHERE j."price_book_id" = b."id" AND j."reseller_id" = b."reseller_id"
  );

-- Drop legacy singular FKs / indexes / columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_station_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book" DROP CONSTRAINT "wf_plan_price_book_station_id_fkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_plan_price_book_reseller_id_fkey'
  ) THEN
    ALTER TABLE "wf_plan_price_book" DROP CONSTRAINT "wf_plan_price_book_reseller_id_fkey";
  END IF;
END $$;

DROP INDEX IF EXISTS "idx_wf_plan_price_book__org_id__station_id";
DROP INDEX IF EXISTS "idx_wf_plan_price_book__org_id__reseller_id";

ALTER TABLE "wf_plan_price_book" DROP COLUMN IF EXISTS "station_id";
ALTER TABLE "wf_plan_price_book" DROP COLUMN IF EXISTS "reseller_id";
