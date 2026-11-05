-- Portal login looks up open sessions by client MAC. The column is unmapped
-- in Prisma, so Postgres stores it as "callingStationId".
CREATE INDEX IF NOT EXISTS idx_wf_radius_session__calling_station_id
  ON wf_radius_session ("callingStationId");
