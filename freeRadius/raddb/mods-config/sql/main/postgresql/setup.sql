/*
 * setup.sql -- PostgreSQL commands for creating the RADIUS user.
 *
 *	WARNING: You should change 'localhost' and 'radpass'
 *		 to something else.  Also update raddb/mods-available/sql
 *		 with the new RADIUS password.
 *
 *	$Id: def55316f645e85184e6abc8d056973678cef4ae $
 */

/*
 *  Create default administrator for RADIUS
 *
 */
CREATE USER radius WITH PASSWORD 'radpass';

/*
 *  The server can read the authorisation data from volo tables
 *
 */
GRANT SELECT ON radcheck TO radius;
GRANT SELECT ON radreply TO radius;
GRANT SELECT ON radusergroup TO radius;
GRANT SELECT ON radgroupcheck TO radius;
GRANT SELECT ON radgroupreply TO radius;

-- Underlying tables used by authorize queries + views
GRANT SELECT ON wf_credential TO radius;
GRANT SELECT ON wf_plan TO radius;
GRANT SELECT ON wf_plan_radius_attribute TO radius;
GRANT SELECT ON wf_station TO radius;
GRANT SELECT ON wf_station_device TO radius;

/*
 *  The server can write accounting data to volo tables
 *
 */
GRANT SELECT, INSERT, UPDATE ON radacct TO radius;
GRANT SELECT, INSERT, UPDATE ON radpostauth TO radius;

-- Grant permissions on wf_radius_session for accounting
GRANT SELECT, INSERT, UPDATE ON wf_radius_session TO radius;

/*
 *  The server can read the NAS data from volo tables
 *
 */
GRANT SELECT ON nas TO radius;

-- Also grant access to the underlying station table
GRANT SELECT ON wf_station TO radius;

/*
 *  In the case of the "lightweight accounting-on/off" strategy, the server also
 *  records NAS reload times
 *
 */
GRANT SELECT, INSERT, UPDATE ON nasreload TO radius;

/*
 * Grant permissions on sequences (for legacy tables if needed)
 *
 */
GRANT USAGE, SELECT ON SEQUENCE radcheck_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radreply_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radusergroup_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radgroupcheck_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radgroupreply_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radacct_radacctid_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE radpostauth_id_seq TO radius;
GRANT USAGE, SELECT ON SEQUENCE nas_id_seq TO radius;
