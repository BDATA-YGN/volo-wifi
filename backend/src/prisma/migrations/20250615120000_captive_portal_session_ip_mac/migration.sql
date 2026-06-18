-- Dedicated client IP/MAC on captive portal session rows (queryable without JSON).

ALTER TABLE wf_captive_portal_session ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE wf_captive_portal_session ADD COLUMN IF NOT EXISTS mac TEXT;

-- JSON column is "nasParams" (camelCase) until a follow-up rename to nas_params.
UPDATE wf_captive_portal_session
SET ip = COALESCE(
  ip,
  "nasParams"->>'ip',
  "nasParams"->>'wlanuserip',
  "nasParams"->>'userip',
  "nasParams"->>'user_ip',
  "nasParams"->>'client_ip'
)
WHERE ip IS NULL;

UPDATE wf_captive_portal_session
SET mac = COALESCE(
  mac,
  "nasParams"->>'mac',
  "nasParams"->>'usermac',
  "nasParams"->>'user_mac',
  "nasParams"->>'client_mac'
)
WHERE mac IS NULL;

CREATE INDEX IF NOT EXISTS idx_wf_captive_portal_session__org_id__ip
  ON wf_captive_portal_session (org_id, ip);
