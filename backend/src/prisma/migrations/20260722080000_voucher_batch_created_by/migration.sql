-- Track which admin created each voucher batch.
ALTER TABLE "wf_voucher_batch" ADD COLUMN IF NOT EXISTS "created_by_admin_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_wf_voucher_batch__created_by_admin_id"
  ON "wf_voucher_batch"("created_by_admin_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wf_voucher_batch_created_by_admin_id_fkey'
  ) THEN
    ALTER TABLE "wf_voucher_batch"
      ADD CONSTRAINT "wf_voucher_batch_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "tbl_admin"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
