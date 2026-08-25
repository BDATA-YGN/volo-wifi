-- Snap STOP time to last RADIUS update. Do not rewrite sessionTimeSec
-- (Acct-Session-Time from the NAS only). Idempotent.

UPDATE wf_radius_session
SET
  stopped_at = COALESCE(last_interim_at, created_at, started_at),
  status = 'STOP'::"RadiusAcctStatus",
  updated_at = CURRENT_TIMESTAMP
WHERE stopped_at IS NOT NULL
  AND last_interim_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (stopped_at - last_interim_at))) > 120;

UPDATE wf_radius_session_archive
SET
  stopped_at = COALESCE(last_interim_at, started_at),
  status = 'STOP'::"RadiusAcctStatus"
WHERE stopped_at IS NOT NULL
  AND last_interim_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (stopped_at - last_interim_at))) > 120;
