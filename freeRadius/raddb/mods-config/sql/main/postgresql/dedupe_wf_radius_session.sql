/*
 * Remove duplicate wf_radius_session rows before adding the unique index.
 * Keeps one row per (acctSessionId, nasIpAddress): prefer STOP > INTERIM > START,
 * then latest lastInterimAt / stoppedAt.
 *
 * Run: psql volo_db -f dedupe_wf_radius_session.sql
 */

BEGIN;

DELETE FROM wf_radius_session d
USING (
	SELECT id
	FROM (
		SELECT
			id,
			ROW_NUMBER() OVER (
				PARTITION BY "acctSessionId", "nasIpAddress"
				ORDER BY
					CASE status
						WHEN 'STOP' THEN 0
						WHEN 'INTERIM' THEN 1
						WHEN 'START' THEN 2
						ELSE 3
					END,
					COALESCE("lastInterimAt", "stoppedAt", "startedAt") DESC NULLS LAST,
					id DESC
			) AS rn
		FROM wf_radius_session
		WHERE "acctSessionId" IS NOT NULL
			AND "nasIpAddress" IS NOT NULL
	) ranked
	WHERE rn > 1
) dup
WHERE d.id = dup.id;

COMMIT;

-- Verify: should return 0 rows
-- SELECT "acctSessionId", "nasIpAddress", COUNT(*) FROM wf_radius_session
-- GROUP BY 1, 2 HAVING COUNT(*) > 1;
