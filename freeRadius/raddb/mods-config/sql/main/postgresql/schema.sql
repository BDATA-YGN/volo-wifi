/*
 * Optional PostgreSQL views for FreeRADIUS — Volo wifi DB integration
 *
 * Prefer the live queries in queries.conf (they hit wf_* tables directly).
 * These views are optional helpers only — do NOT require a separate FreeRADIUS
 * schema. Apply only if you want classic radcheck/nas names for debugging:
 *   psql "$DATABASE_URL" -f schema.sql
 *
 * Maps:
 * - nas            → wf_station_device (+ secrets)
 * - radcheck       → wf_credential + wf_plan (password / Simultaneous-Use)
 * - radreply       → wf_credential + wf_plan_radius_attribute (REPLY)
 * - radusergroup   → wf_credential + wf_plan
 * - radgroupcheck  → CHECK attrs
 * - radgroupreply  → empty (REPLY is per-user)
 *
 * Keep column names in sync with backend/src/prisma/models/wifi (@map snake_case
 * plus quoted camelCase leftovers such as "nasShortname", "timeRemainingSec").
 */

--
-- View: nas (maps to wf_station_device)
--
CREATE OR REPLACE VIEW nas AS
SELECT
	ROW_NUMBER() OVER (ORDER BY d.id)::integer AS id,
	COALESCE(d.ip_addr, s."radiusClientIp", d.id) AS nasname,
	COALESCE(d."nasShortname", LEFT(d.id, 32)) AS shortname,
	COALESCE(d.nas_type, 'other') AS type,
	d."nasPorts" AS ports,
	COALESCE(NULLIF(d.radius_secret, ''), rp.shared_secret, '') AS secret,
	d."nasServer" AS server,
	d."nasCommunity" AS community,
	COALESCE(d.note, d.vendor || ' ' || d.model) AS description
FROM wf_station_device d
LEFT JOIN wf_station s ON s.id = d.station_id AND s.deleted_at IS NULL
LEFT JOIN wf_org_radius_profile rp ON rp.id = d.radius_profile_id AND rp.deleted_at IS NULL
WHERE d.is_radius_client = true
	AND d.deleted_at IS NULL;

--
-- View: radcheck — password + Simultaneous-Use (concurrent / maxDevices)
--
CREATE OR REPLACE VIEW radcheck AS
SELECT
	ROW_NUMBER() OVER (ORDER BY sort_key, cred_id)::integer AS id,
	username,
	attribute,
	op,
	value
FROM (
	SELECT
		1 AS sort_key,
		c.id AS cred_id,
		COALESCE(c.username, c.token) AS username,
		CASE
			WHEN c.username IS NOT NULL AND c.password_hash IS NOT NULL THEN 'Crypt-Password'
			WHEN c.token IS NOT NULL THEN 'Cleartext-Password'
		END AS attribute,
		':=' AS op,
		CASE
			WHEN c.username IS NOT NULL AND c.password_hash IS NOT NULL THEN c.password_hash
			WHEN c.token IS NOT NULL THEN c.token
		END AS value
	FROM wf_credential c
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
		AND (
			(c.username IS NOT NULL AND c.password_hash IS NOT NULL)
			OR c.token IS NOT NULL
		)

	UNION ALL

	SELECT
		2 AS sort_key,
		c.id AS cred_id,
		COALESCE(c.username, c.token) AS username,
		'Simultaneous-Use' AS attribute,
		':=' AS op,
		COALESCE(p.max_devices, 1)::text AS value
	FROM wf_credential c
	INNER JOIN wf_plan p ON c.plan_id = p.id AND p.deleted_at IS NULL
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
		AND COALESCE(p.max_devices, 1) >= 1
) combined;

--
-- View: radreply — per-user REPLY (station-scoped plan attributes + remaining quota)
-- {timeSeconds} expands to plan_quota − cumulative RADIUS used for THIS credential only
-- (credential_id match, or User-Name when credential_id is null). Not shared across devices/tokens.
--
CREATE OR REPLACE VIEW radreply AS
SELECT
	ROW_NUMBER() OVER (ORDER BY cred_id, priority)::integer AS id,
	username,
	attribute,
	op,
	value
FROM (
	SELECT DISTINCT ON (c.id, pra."attributeName")
		c.id AS cred_id,
		pra.priority,
		COALESCE(c.username, c.token) AS username,
		pra."attributeName" AS attribute,
		pra.op,
		CASE
			WHEN pra.value LIKE '%{timeSeconds}%' THEN
				REPLACE(
					pra.value,
					'{timeSeconds}',
					CASE
						WHEN COALESCE(p.time_amount, 0) > 0 AND p.time_unit IS NOT NULL THEN
							GREATEST(
								0,
								(p.time_amount *
									CASE p.time_unit
										WHEN 'MINUTE' THEN 60
										WHEN 'HOUR' THEN 3600
										WHEN 'DAY' THEN 86400
										WHEN 'MONTH' THEN 2592000
										ELSE 0
									END) - COALESCE(used.used_sec, 0)
							)::text
						ELSE
							COALESCE(
								c."timeRemainingSec"::text,
								(COALESCE(p.time_amount, 0) *
									CASE p.time_unit
										WHEN 'MINUTE' THEN 60
										WHEN 'HOUR' THEN 3600
										WHEN 'DAY' THEN 86400
										WHEN 'MONTH' THEN 2592000
										ELSE 0
									END)::text,
								'0'
							)
					END
				)
			WHEN pra.value LIKE '%{dataMb}%' THEN
				REPLACE(
					pra.value,
					'{dataMb}',
					COALESCE(c.data_remaining_mb::text, p.data_mb::text, '0')
				)
			ELSE pra.value
		END AS value
	FROM wf_credential c
	INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
	LEFT JOIN wf_station ws ON ws.id = c.station_id AND ws.deleted_at IS NULL
	LEFT JOIN LATERAL (
		SELECT COALESCE(SUM(
			GREATEST(
				COALESCE(rs."sessionTimeSec", 0),
				GREATEST(
					0,
					FLOOR(EXTRACT(EPOCH FROM (
						COALESCE(rs.stopped_at, CURRENT_TIMESTAMP) - rs.started_at
					)))::integer
				)
			)
		), 0)::integer AS used_sec
		FROM wf_radius_session rs
		WHERE (
			rs.credential_id = c.id
			OR (
				rs.credential_id IS NULL
				AND (
					(c.username IS NOT NULL AND rs.user_name = c.username)
					OR (c.token IS NOT NULL AND (rs.user_name = c.token OR rs.user_name = UPPER(c.token)))
				)
			)
		)
		AND (
			p.time_usage_mode::text IS DISTINCT FROM 'SINGLE_SESSION'
			OR rs.started_at >= COALESCE(
				c.single_session_reseller_unlock_at,
				c.activated_at,
				c.sold_at,
				'-infinity'::timestamptz
			)
		)
	) used ON true
	INNER JOIN wf_plan_radius_attribute pra ON pra.plan_id = p.id
		AND pra.phase = 'REPLY'
		AND pra.deleted_at IS NULL
		AND (
			pra.wifi_station_id IS NULL
			OR (c.station_id IS NOT NULL AND pra.wifi_station_id = c.station_id)
		)
		AND (
			c.station_id IS NULL
			OR ws.radius_vendor_profile_id IS NULL
			OR pra.vendor_profile_id IS NULL
			OR pra.vendor_profile_id = ws.radius_vendor_profile_id
		)
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
	ORDER BY c.id, pra."attributeName", pra.priority ASC, pra.id
) deduped;

--
-- View: radgroupcheck — composite group + station-scoped CHECK
-- Group key: plan.code || COALESCE(c.username, c.token)
--
CREATE OR REPLACE VIEW radgroupcheck AS
SELECT
	ROW_NUMBER() OVER (ORDER BY groupname, attribute)::integer AS id,
	groupname,
	attribute,
	op,
	value
FROM (
	SELECT DISTINCT ON (p.code || COALESCE(c.username, c.token), pra."attributeName")
		p.code || COALESCE(c.username, c.token) AS groupname,
		pra."attributeName" AS attribute,
		pra.op,
		pra.value
	FROM wf_credential c
	INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
	LEFT JOIN wf_station ws ON ws.id = c.station_id AND ws.deleted_at IS NULL
	INNER JOIN wf_plan_radius_attribute pra ON pra.plan_id = p.id
		AND pra.phase = 'CHECK'
		AND pra.deleted_at IS NULL
		AND (
			pra.wifi_station_id IS NULL
			OR (c.station_id IS NOT NULL AND pra.wifi_station_id = c.station_id)
		)
		AND (
			c.station_id IS NULL
			OR ws.radius_vendor_profile_id IS NULL
			OR pra.vendor_profile_id IS NULL
			OR pra.vendor_profile_id = ws.radius_vendor_profile_id
		)
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
	ORDER BY p.code || COALESCE(c.username, c.token), pra."attributeName", pra.priority ASC, pra.id
) deduped;

--
-- View: radgroupreply — empty; REPLY attrs are on radreply per username
--
CREATE OR REPLACE VIEW radgroupreply AS
SELECT
	ROW_NUMBER() OVER ()::integer AS id,
	groupname,
	attribute,
	op,
	value
FROM (
	SELECT
		NULL::varchar(128) AS groupname,
		NULL::varchar(64) AS attribute,
		NULL::varchar(2) AS op,
		NULL::varchar(253) AS value
	WHERE false
) empty;

--
-- View: radusergroup — username → planCodetoken group for radgroupcheck
--
CREATE OR REPLACE VIEW radusergroup AS
SELECT
	ROW_NUMBER() OVER (ORDER BY c.id)::integer AS id,
	COALESCE(c.username, c.token) AS username,
	p.code || COALESCE(c.username, c.token) AS groupname,
	1 AS priority
FROM wf_credential c
INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
WHERE (c.username IS NOT NULL OR c.token IS NOT NULL);

--
-- Table: nasreload (simultaneous-use / NAS reload tracking)
--
CREATE TABLE IF NOT EXISTS nasreload (
	"NASIPAddress"		inet PRIMARY KEY,
	"ReloadTime"		timestamp with time zone NOT NULL
);

--
-- Table: radpostauth (post-authentication logging; written by FreeRADIUS)
--
CREATE TABLE IF NOT EXISTS radpostauth (
	id			bigserial PRIMARY KEY,
	username		text NOT NULL,
	pass			text,
	reply			text,
	CalledStationId		text,
	CallingStationId	text,
	authdate		timestamp with time zone NOT NULL default now(),
	Class			text
);
CREATE INDEX radpostauth_username_idx ON radpostauth (username);
CREATE INDEX radpostauth_class_idx ON radpostauth (Class);
