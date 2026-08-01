/*
 * Remove duplicate wf_radius_session rows before adding the unique index.
 * Keeps one row per (acctSessionId, nasIpAddress): prefer STOP > INTERIM > START,
 * then latest lastInterimAt / stoppedAt.
 *
 * Run: psql volo_wifi_db -f dedupe_wf_radius_session.sql
 */

BEGIN;

DELETE FROM wf_radius_session d
USING (
	SELECT id
	FROM (
		SELECT
			id,
			ROW_NUMBER() OVER (
				PARTITION BY acct_session_id, nas_ip_address
				ORDER BY
					CASE status
						WHEN 'STOP' THEN 0
						WHEN 'INTERIM' THEN 1
						WHEN 'START' THEN 2
						ELSE 3
					END,
					COALESCE(last_interim_at, stopped_at, started_at) DESC NULLS LAST,
					id DESC
			) AS rn
		FROM wf_radius_session
		WHERE acct_session_id IS NOT NULL
			AND nas_ip_address IS NOT NULL
	) ranked
	WHERE rn > 1
) dup
WHERE d.id = dup.id;

COMMIT;

-- Verify: should return 0 rows
-- SELECT acct_session_id, nas_ip_address, COUNT(*) FROM wf_radius_session
-- GROUP BY 1, 2 HAVING COUNT(*) > 1;
