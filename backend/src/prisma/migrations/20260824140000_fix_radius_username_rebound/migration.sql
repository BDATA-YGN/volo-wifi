-- Restore RADIUS rows whose user_name was overwritten onto a leftover
-- MikroTik hotspot session (same Acct-Session-Id, different voucher).
-- Cap leftover host uptime at the original plan quota (max 12h).
-- Idempotent: mismatch predicate matches 0 rows after the first run.

WITH stolen AS (
  SELECT
    rs.id,
    COALESCE(c.token, c.username) AS restore_name,
    CASE
      WHEN GREATEST(
        0,
        FLOOR(EXTRACT(EPOCH FROM (
          COALESCE(rs.stopped_at, rs.last_interim_at, CURRENT_TIMESTAMP)
          - rs.started_at
        )))::integer
      ) > 43200
      THEN CASE
        WHEN COALESCE(rs."sessionTimeSec", 0) > 0
          AND COALESCE(rs."sessionTimeSec", 0) <= 43200
        THEN rs."sessionTimeSec"
        ELSE LEAST(
          COALESCE(
            CASE
              WHEN COALESCE(p.time_amount, 0) > 0 AND p.time_unit IS NOT NULL THEN
                p.time_amount * CASE p.time_unit
                  WHEN 'MINUTE' THEN 60
                  WHEN 'HOUR' THEN 3600
                  WHEN 'DAY' THEN 86400
                  WHEN 'MONTH' THEN 2592000
                  ELSE 0
                END
            END,
            43200
          ),
          43200
        )
      END
      ELSE rs."sessionTimeSec"
    END AS capped_sec
  FROM wf_radius_session rs
  JOIN wf_credential c ON c.id = rs.credential_id
  LEFT JOIN wf_plan p ON p.id = c.plan_id
  WHERE c.token IS NOT NULL
    AND rs.user_name IS DISTINCT FROM c.token
    AND (c.username IS NULL OR rs.user_name IS DISTINCT FROM c.username)
)
UPDATE wf_radius_session rs
SET
  user_name = s.restore_name,
  "sessionTimeSec" = s.capped_sec,
  stopped_at = CASE
    WHEN COALESCE(s.capped_sec, 0) > 0
      AND EXTRACT(EPOCH FROM (
        COALESCE(rs.stopped_at, rs.last_interim_at, CURRENT_TIMESTAMP) - rs.started_at
      )) > 43200
    THEN rs.started_at + (s.capped_sec * INTERVAL '1 second')
    ELSE COALESCE(rs.stopped_at, rs.last_interim_at)
  END,
  last_interim_at = CASE
    WHEN COALESCE(s.capped_sec, 0) > 0
      AND EXTRACT(EPOCH FROM (
        COALESCE(rs.stopped_at, rs.last_interim_at, CURRENT_TIMESTAMP) - rs.started_at
      )) > 43200
    THEN rs.started_at + (s.capped_sec * INTERVAL '1 second')
    ELSE rs.last_interim_at
  END,
  status = 'STOP'::"RadiusAcctStatus",
  terminate_cause = COALESCE(NULLIF(rs.terminate_cause, ''), 'User-Name-Rebound-Repair'),
  updated_at = CURRENT_TIMESTAMP
FROM stolen s
WHERE rs.id = s.id;

UPDATE wf_radius_session rs
SET
  started_at = GREATEST(rs.started_at, COALESCE(c.activated_at, c.sold_at, c.created_at)),
  updated_at = CURRENT_TIMESTAMP
FROM wf_credential c
WHERE c.id = rs.credential_id
  AND rs.started_at < COALESCE(c.activated_at, c.sold_at, c.created_at) - INTERVAL '120 seconds';
