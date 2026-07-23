-- Align Plan.timeUnit column with other snake_case wf_plan fields / Prisma @map.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wf_plan'
      AND column_name = 'timeUnit'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wf_plan'
      AND column_name = 'time_unit'
  ) THEN
    ALTER TABLE "wf_plan" RENAME COLUMN "timeUnit" TO "time_unit";
  END IF;
END $$;
