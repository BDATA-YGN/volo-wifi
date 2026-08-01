/*
 * Optional performance indexes for FreeRADIUS + Volo (PostgreSQL).
 * Run once on volo_db, e.g. psql -f indexes.sql
 * Use CONCURRENTLY in production if tables are large.
 */

-- Credential lookup by token (voucher auth) — unique exists; ensure used
CREATE INDEX IF NOT EXISTS wf_credential_token_active_idx
	ON wf_credential (token)
	WHERE token IS NOT NULL
		AND status IN ('SOLD', 'ACTIVE', 'ACTIVATED', 'IN_USE')
		AND revoked_at IS NULL
		AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS wf_credential_username_active_idx
	ON wf_credential (username)
	WHERE username IS NOT NULL
		AND status IN ('SOLD', 'ACTIVE', 'ACTIVATED', 'IN_USE')
		AND revoked_at IS NULL
		AND deleted_at IS NULL;

-- Plan RADIUS attributes (authorize reply/check per credential)
CREATE INDEX IF NOT EXISTS wf_plan_radius_attribute_plan_phase_idx
	ON wf_plan_radius_attribute (plan_id, phase, priority)
	WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS wf_plan_radius_attribute_station_idx
	ON wf_plan_radius_attribute (plan_id, wifi_station_id, phase)
	WHERE deleted_at IS NULL;

-- One row per RADIUS session on a NAS (required for ON CONFLICT in queries.conf).
-- Run dedupe_wf_radius_session.sql first if duplicates exist.
CREATE UNIQUE INDEX IF NOT EXISTS wf_radius_session_acct_nas_unique
	ON wf_radius_session (acct_session_id, nas_ip_address);

CREATE INDEX IF NOT EXISTS wf_radius_session_acct_nas_open_idx
	ON wf_radius_session (acct_session_id, nas_ip_address)
	WHERE stopped_at IS NULL;

CREATE INDEX IF NOT EXISTS wf_radius_session_user_open_idx
	ON wf_radius_session (user_name)
	WHERE stopped_at IS NULL;

-- Required once if orgId is NOT NULL: accounting INSERT omits orgId
ALTER TABLE wf_radius_session ALTER COLUMN org_id DROP NOT NULL;

-- Station org resolution from NAS
CREATE INDEX IF NOT EXISTS wf_station_radius_client_ip_idx
	ON wf_station ("radiusClientIp")
	WHERE deleted_at IS NULL AND "radiusClientIp" IS NOT NULL;

CREATE INDEX IF NOT EXISTS wf_station_nas_identifier_idx
	ON wf_station ("nasIdentifier")
	WHERE deleted_at IS NULL AND "nasIdentifier" IS NOT NULL;
