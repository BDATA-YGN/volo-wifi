/*
 * PostgreSQL schema for FreeRADIUS — Volo database integration
 *
 * Views map FreeRADIUS table names to Volo tables. Keep in sync with:
 * volo-api-console/backend/src/prisma/seed/seed-freeradius.ts
 *
 * - radcheck: password + Simultaneous-Use (plan maxDevices)
 * - radreply: per-user REPLY (station-scoped plan attributes + remaining quota)
 * - radusergroup: username → {planCode}{tokenOrUsername} for radgroupcheck
 * - radgroupcheck: CHECK attrs for that composite group
 * - radgroupreply: empty (REPLY is on radreply per user)
 * - nas: RADIUS clients from wf_station_device
 */

--
-- View: nas (maps to wf_station_device)
--
CREATE OR REPLACE VIEW nas AS
SELECT
	ROW_NUMBER() OVER (ORDER BY id)::integer AS id,
	COALESCE("ipAddr", id) AS nasname,
	COALESCE("nasShortname", LEFT(id, 32)) AS shortname,
	COALESCE("nasType", 'other') AS type,
	"nasPorts" AS ports,
	COALESCE("radiusSecret", '') AS secret,
	"nasServer" AS server,
	"nasCommunity" AS community,
	COALESCE(note, vendor || ' ' || model) AS description
FROM wf_station_device
WHERE "isRadiusClient" = true;

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
			WHEN c.username IS NOT NULL AND c."passwordHash" IS NOT NULL THEN 'Crypt-Password'
			WHEN c.token IS NOT NULL THEN 'Cleartext-Password'
		END AS attribute,
		':=' AS op,
		CASE
			WHEN c.username IS NOT NULL AND c."passwordHash" IS NOT NULL THEN c."passwordHash"
			WHEN c.token IS NOT NULL THEN c.token
		END AS value
	FROM wf_credential c
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
		AND (
			(c.username IS NOT NULL AND c."passwordHash" IS NOT NULL)
			OR c.token IS NOT NULL
		)

	UNION ALL

	SELECT
		2 AS sort_key,
		c.id AS cred_id,
		COALESCE(c.username, c.token) AS username,
		'Simultaneous-Use' AS attribute,
		':=' AS op,
		COALESCE(p."maxDevices", 1)::text AS value
	FROM wf_credential c
	INNER JOIN wf_plan p ON c."planId" = p.id AND p."deletedAt" IS NULL
	WHERE (c.username IS NOT NULL OR c.token IS NOT NULL)
		AND COALESCE(p."maxDevices", 1) >= 1
) combined;

--
-- View: radreply — per-user REPLY (station-scoped plan attributes + remaining quota)
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
					COALESCE(
						c."timeRemainingSec"::text,
						(p."timeAmount" *
							CASE p."timeUnit"
								WHEN 'MINUTE' THEN 60
								WHEN 'HOUR' THEN 3600
								WHEN 'DAY' THEN 86400
								ELSE 0
							END)::text,
						'0'
					)
				)
			WHEN pra.value LIKE '%{dataMb}%' THEN
				REPLACE(
					pra.value,
					'{dataMb}',
					COALESCE(c."dataRemainingMb"::text, p."dataMb"::text, '0')
				)
			ELSE pra.value
		END AS value
	FROM wf_credential c
	INNER JOIN wf_plan p ON p.id = c."planId" AND p."deletedAt" IS NULL
	LEFT JOIN wf_station ws ON ws.id = c."stationId" AND ws."deletedAt" IS NULL
	INNER JOIN wf_plan_radius_attribute pra ON pra."planId" = p.id
		AND pra.phase = 'REPLY'
		AND pra."deletedAt" IS NULL
		AND (
			pra."wifiStationId" IS NULL
			OR (c."stationId" IS NOT NULL AND pra."wifiStationId" = c."stationId")
		)
		AND (
			c."stationId" IS NULL
			OR ws."radiusVendorProfileId" IS NULL
			OR pra."vendorProfileId" IS NULL
			OR pra."vendorProfileId" = ws."radiusVendorProfileId"
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
	INNER JOIN wf_plan p ON p.id = c."planId" AND p."deletedAt" IS NULL
	LEFT JOIN wf_station ws ON ws.id = c."stationId" AND ws."deletedAt" IS NULL
	INNER JOIN wf_plan_radius_attribute pra ON pra."planId" = p.id
		AND pra.phase = 'CHECK'
		AND pra."deletedAt" IS NULL
		AND (
			pra."wifiStationId" IS NULL
			OR (c."stationId" IS NOT NULL AND pra."wifiStationId" = c."stationId")
		)
		AND (
			c."stationId" IS NULL
			OR ws."radiusVendorProfileId" IS NULL
			OR pra."vendorProfileId" IS NULL
			OR pra."vendorProfileId" = ws."radiusVendorProfileId"
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
INNER JOIN wf_plan p ON p.id = c."planId" AND p."deletedAt" IS NULL
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
