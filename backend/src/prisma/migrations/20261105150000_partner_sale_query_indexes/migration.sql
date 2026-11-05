-- Build outside Prisma's transaction so writes are not blocked while the
-- index is created. Migrate uses the direct database port (25060), not the pool.
-- The lower(username) indexes are expression indexes. Prisma cannot represent
-- them, so a later migrate diff may want to drop them. Keep them.
COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wf_voucher_batch__org_id__plan_id__created_at
  ON wf_voucher_batch (org_id, plan_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wf_voucher_batch__available_fifo
  ON wf_voucher_batch (org_id, plan_id, created_at)
  WHERE deleted_at IS NULL
    AND reseller_id IS NULL
    AND remaining_quantity > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wf_credential__lower_username
  ON wf_credential (lower(username));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wf_credential_arc__lower_username
  ON wf_credential_archive (lower(username));

BEGIN;
