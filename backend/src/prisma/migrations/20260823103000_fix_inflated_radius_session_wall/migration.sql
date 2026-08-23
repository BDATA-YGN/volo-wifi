-- Stop inflated RADIUS rows at last RADIUS update instead of cleanup "now".
-- Keep Acct-Session-Time when it looks like real NAS time (≤12h); otherwise
-- store last-interim − start. Idempotent: skips rows already aligned.

UPDATE wf_radius_session rs
SET
  stopped_at = COALESCE(rs.last_interim_at, rs.created_at, rs.started_at),
  status = 'STOP'::"RadiusAcctStatus",
  "sessionTimeSec" = CASE
    WHEN COALESCE(rs."sessionTimeSec", 0) > 0
      AND COALESCE(rs."sessionTimeSec", 0) <= 43200
    THEN rs."sessionTimeSec"
    ELSE GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (
        COALESCE(rs.last_interim_at, rs.created_at, rs.started_at)
        - GREATEST(rs.started_at, rs.created_at)
      )))::integer
    )
  END,
  terminate_cause = COALESCE(NULLIF(rs.terminate_cause, ''), 'Last-Interim-Stop'),
  updated_at = CURRENT_TIMESTAMP
WHERE rs.stopped_at IS NOT NULL
  AND (
    (
      EXTRACT(EPOCH FROM (
        rs.stopped_at - GREATEST(rs.started_at, rs.created_at)
      )) > 43200
      AND (
        rs.last_interim_at IS NULL
        OR rs.stopped_at > rs.last_interim_at + INTERVAL '120 seconds'
      )
    )
    OR (
      COALESCE(rs."sessionTimeSec", 0) > 43200
      AND COALESCE(rs."sessionTimeSec", 0) > GREATEST(
        0,
        FLOOR(EXTRACT(EPOCH FROM (
          COALESCE(rs.last_interim_at, rs.created_at, rs.started_at)
          - GREATEST(rs.started_at, rs.created_at)
        )))::integer
      ) * 2
    )
  );

UPDATE wf_radius_session_archive rs
SET
  stopped_at = COALESCE(rs.last_interim_at, rs.started_at),
  status = 'STOP'::"RadiusAcctStatus",
  session_time_sec = CASE
    WHEN COALESCE(rs.session_time_sec, 0) > 0
      AND COALESCE(rs.session_time_sec, 0) <= 43200
    THEN rs.session_time_sec
    ELSE GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (
        COALESCE(rs.last_interim_at, rs.started_at) - rs.started_at
      )))::integer
    )
  END,
  terminate_cause = COALESCE(NULLIF(rs.terminate_cause, ''), 'Last-Interim-Stop')
WHERE rs.stopped_at IS NOT NULL
  AND (
    (
      EXTRACT(EPOCH FROM (rs.stopped_at - rs.started_at)) > 43200
      AND (
        rs.last_interim_at IS NULL
        OR rs.stopped_at > rs.last_interim_at + INTERVAL '120 seconds'
      )
    )
    OR (
      COALESCE(rs.session_time_sec, 0) > 43200
      AND COALESCE(rs.session_time_sec, 0) > GREATEST(
        0,
        FLOOR(EXTRACT(EPOCH FROM (
          COALESCE(rs.last_interim_at, rs.started_at) - rs.started_at
        )))::integer
      ) * 2
    )
  );
