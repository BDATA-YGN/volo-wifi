-- Equality lookups that were sequential scans on hot paths.
CREATE INDEX IF NOT EXISTS idx_tbl_admin_token__token ON tbl_admin_token (token);
CREATE INDEX IF NOT EXISTS idx_tbl_admin_token__refresh_token ON tbl_admin_token (refresh_token);
CREATE INDEX IF NOT EXISTS idx_wf_radius_session_arc__user_name ON wf_radius_session_archive (user_name);
CREATE INDEX IF NOT EXISTS idx_wf_sale_order__org_id__station_id ON wf_sale_order (org_id, station_id);
CREATE INDEX IF NOT EXISTS radpostauth_authdate_idx ON radpostauth (authdate);
CREATE INDEX IF NOT EXISTS idx_wf_credential_arc__archived_at ON wf_credential_archive (archived_at);
CREATE INDEX IF NOT EXISTS idx_wf_radius_session_arc__stopped_at ON wf_radius_session_archive (stopped_at);
