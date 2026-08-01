# PostgreSQL Query Documentation - Volo Radius Project

> **Column naming (FreeRADIUS DB = `volo_wifi_db`):** Follow Prisma wifi
> `@map` **snake_case** for mapped fields (`expires_at`, `password_hash`,
> `plan_id`, `acct_session_id`, `user_name`, …). A few fields still have no
> real `@map` (only a comment) and stay quoted camelCase in SQL:
> `"timeRemainingSec"`, `"callingStationId"`, `"inputBytes"`, `"outputBytes"`,
> `"totalBytes"`, `"sessionTimeSec"`, `"attributeName"`, and on
> `wf_station` / `wf_station_device`: `"nasIdentifier"`, `"radiusClientIp"`,
> `"nasShortname"`, `"nasPorts"`, `"nasServer"`, `"nasCommunity"`.
>
> Source of truth for live queries: `raddb/mods-config/sql/main/postgresql/queries.conf`.

This document provides detailed information about all PostgreSQL queries used in the Volo Wifi Station Management System with FreeRADIUS integration.

## Table of Contents

1. [Database Schema Overview](#database-schema-overview)
2. [Authentication & Authorization Queries](#authentication--authorization-queries)
3. [Accounting Queries](#accounting-queries)
4. [Simultaneous Use Checking Queries](#simultaneous-use-checking-queries)
5. [Group Membership Queries](#group-membership-queries)
6. [IP Pool Management Queries](#ip-pool-management-queries)
7. [Post-Authentication Queries](#post-authentication-queries)
8. [Database Views](#database-views)
9. [Table Schemas](#table-schemas)

---

## Database Schema Overview

The system uses PostgreSQL with FreeRADIUS integration. The main tables are defined in the Prisma schema (`volo.prisma`) and mapped to FreeRADIUS tables through views:

| Prisma Model        | FreeRADIUS Table                       | Purpose                             |
| ------------------- | -------------------------------------- | ----------------------------------- |
| `wf_credential`     | `radcheck`, `radreply`, `radusergroup` | User authentication & authorization |
| `wf_radius_session` | `radacct`                              | RADIUS accounting sessions          |
| `wf_station`        | `nas`                                  | NAS (Network Access Server) devices |

---

## Authentication & Authorization Queries

### 1. Client Query (NAS Retrieval)

**Purpose:** Retrieve RADIUS client (NAS) information from the database.

```sql
SELECT id, nasname, shortname, type, secret, server 
FROM ${client_table}
```

**Parameters:**
- `client_table`: Defaults to `nas`

**Returns:** NAS client details including IP address, shortname, type, and secret

---

### 2. Authorize Check Query

**Purpose:** Retrieve check items for user authentication.

```sql
SELECT id, UserName, Attribute, Value, Op 
FROM ${authcheck_table} 
WHERE LOWER(UserName) = LOWER('%{SQL-User-Name}') 
ORDER BY id
```

**Parameters:**
- `authcheck_table`: Defaults to `radcheck`
- `SQL-User-Name`: The username from the RADIUS request

**Purpose:** Fetches password/credential attributes for user authentication.

---

### 3. Authorize Reply Query

**Purpose:** Retrieve reply items for user authorization.

```sql
SELECT id, UserName, Attribute, Value, Op 
FROM ${authreply_table} 
WHERE LOWER(UserName) = LOWER('%{SQL-User-Name}') 
ORDER BY id
```

**Parameters:**
- `authreply_table`: Defaults to `radreply`

**Purpose:** Returns authorization attributes (e.g., Service-Type) after successful authentication.

---

### 4. Authorize Group Check Query

**Purpose:** Retrieve check items for group-based authorization.

```sql
SELECT id, GroupName, Attribute, Value, op 
FROM ${groupcheck_table} 
WHERE GroupName = '%{${group_attribute}}' 
ORDER BY id
```

**Parameters:**
- `groupcheck_table`: Defaults to `radgroupcheck`
- `group_attribute`: SQL-Group attribute from RADIUS request

---

### 5. Authorize Group Reply Query

**Purpose:** Retrieve reply items for group-based authorization.

```sql
SELECT id, GroupName, Attribute, Value, op 
FROM ${groupreply_table} 
WHERE GroupName = '%{${group_attribute}}' 
ORDER BY id
```

**Parameters:**
- `groupreply_table`: Defaults to `radgroupreply`

---

## Accounting Queries

### 6. Accounting Start (Session Initiation)

**Purpose:** Insert a new RADIUS session when a user connects.

```sql
INSERT INTO wf_radius_session (
    id, "orgId", "acctSessionId", "userName", status, "startedAt", "lastInterimAt",
    "callingStationId", "framedIpAddress", "nasIpAddress", "nasIdentifier", "updatedAt"
) VALUES(
    gen_random_uuid(),
    '%{Volo-Org-Id}',
    '%{Acct-Session-Id}',
    '%{SQL-User-Name}',
    'START'::"RadiusAcctStatus",
    TO_TIMESTAMP(%{event_timestamp_epoch}),
    TO_TIMESTAMP(%{event_timestamp_epoch}),
    '%{Calling-Station-Id}',
    NULLIF('%{Framed-IP-Address}', '')::text,
    '%{%{NAS-IPv6-Address}:-%{NAS-IP-Address}}',
    NULLIF('%{NAS-Identifier}', ''),
    CURRENT_TIMESTAMP
) 
ON CONFLICT ("orgId", "acctSessionId") 
DO UPDATE 
SET 
    "startedAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    "lastInterimAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    status = 'START'::"RadiusAcctStatus",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE wf_radius_session."orgId" = '%{Volo-Org-Id}' 
AND wf_radius_session."acctSessionId" = '%{Acct-Session-Id}'
```

**Parameters:**
- `Volo-Org-Id`: Organization ID from RADIUS request
- `Acct-Session-Id`: Unique session identifier
- `SQL-User-Name`: Username
- `Calling-Station-Id`: Client MAC address
- `Framed-IP-Address`: Assigned IP address
- `NAS-IP-Address`: NAS IP address
- `NAS-Identifier`: NAS identifier

**Fallback Query:**
```sql
UPDATE wf_radius_session 
SET 
    "startedAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    "lastInterimAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    status = 'START'::"RadiusAcctStatus",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "orgId" = '%{Volo-Org-Id}' 
AND "acctSessionId" = '%{Acct-Session-Id}'
```

---

### 7. Accounting Interim-Update

**Purpose:** Update session statistics during active connections (periodic updates).

```sql
UPDATE wf_radius_session 
SET 
    "framedIpAddress" = NULLIF('%{Framed-IP-Address}', '')::text,
    "sessionTimeSec" = %{%{Acct-Session-Time}:-NULL},
    "lastInterimAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    "inputBytes" = (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint),
    "outputBytes" = (('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    "totalBytes" = (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint + 
                    ('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    status = 'INTERIM'::"RadiusAcctStatus",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "orgId" = '%{Volo-Org-Id}' 
AND "acctSessionId" = '%{Acct-Session-Id}' 
AND "stoppedAt" IS NULL
```

**Parameters:**
- `Acct-Session-Time`: Session duration in seconds
- `Acct-Input-Octets`: Bytes received
- `Acct-Output-Octets`: Bytes sent
- `Acct-Input-Gigawords`: High-order bytes for input (32-bit overflow)
- `Acct-Output-Gigawords`: High-order bytes for output (32-bit overflow)

**Fallback Query (Insert if not exists):**
```sql
INSERT INTO wf_radius_session (
    id, "orgId", "acctSessionId", "userName", status, "startedAt", "lastInterimAt",
    "sessionTimeSec", "inputBytes", "outputBytes", "totalBytes", "callingStationId",
    "framedIpAddress", "nasIpAddress", "nasIdentifier", "updatedAt"
) VALUES(
    gen_random_uuid(),
    '%{Volo-Org-Id}',
    '%{Acct-Session-Id}',
    '%{SQL-User-Name}',
    'INTERIM'::"RadiusAcctStatus",
    TO_TIMESTAMP(%{event_timestamp_epoch} - %{%{Acct-Session-Time}:-0}),
    TO_TIMESTAMP(%{event_timestamp_epoch}),
    %{%{Acct-Session-Time}:-NULL},
    (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint),
    (('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint + 
     ('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    '%{Calling-Station-Id}',
    NULLIF('%{Framed-IP-Address}', '')::text,
    '%{%{NAS-IPv6-Address}:-%{NAS-IP-Address}}',
    NULLIF('%{NAS-Identifier}', ''),
    CURRENT_TIMESTAMP
) 
ON CONFLICT ("orgId", "acctSessionId") 
DO NOTHING
```

---

### 8. Accounting Stop (Session Termination)

**Purpose:** Close a RADIUS session and record final statistics.

```sql
UPDATE wf_radius_session 
SET 
    "stoppedAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    "lastInterimAt" = TO_TIMESTAMP(%{event_timestamp_epoch}),
    "sessionTimeSec" = COALESCE(%{%{Acct-Session-Time}:-NULL},
        (%{event_timestamp_epoch} - EXTRACT(EPOCH FROM("startedAt"))))::integer,
    "inputBytes" = (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint),
    "outputBytes" = (('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    "totalBytes" = (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint + 
                    ('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    "terminateCause" = '%{Acct-Terminate-Cause}',
    "framedIpAddress" = NULLIF('%{Framed-IP-Address}', '')::text,
    status = 'STOP'::"RadiusAcctStatus",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "orgId" = '%{Volo-Org-Id}' 
AND "acctSessionId" = '%{Acct-Session-Id}' 
AND "stoppedAt" IS NULL
```

**Parameters:**
- `Acct-Terminate-Cause`: Reason for session termination

**Fallback Query (Insert if not exists):**
```sql
INSERT INTO wf_radius_session (
    id, "orgId", "acctSessionId", "userName", status, "startedAt", "lastInterimAt", "stoppedAt",
    "sessionTimeSec", "inputBytes", "outputBytes", "totalBytes", "callingStationId",
    "terminateCause", "framedIpAddress", "nasIpAddress", "nasIdentifier", "updatedAt"
) VALUES(
    gen_random_uuid(),
    '%{Volo-Org-Id}',
    '%{Acct-Session-Id}',
    '%{SQL-User-Name}',
    'STOP'::"RadiusAcctStatus",
    TO_TIMESTAMP(%{event_timestamp_epoch} - %{%{Acct-Session-Time}:-0}),
    TO_TIMESTAMP(%{event_timestamp_epoch}),
    TO_TIMESTAMP(%{event_timestamp_epoch}),
    NULLIF('%{Acct-Session-Time}', '')::integer,
    (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint),
    (('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    (('%{%{Acct-Input-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Input-Octets}:-0}'::bigint + 
     ('%{%{Acct-Output-Gigawords}:-0}'::bigint << 32) + '%{%{Acct-Output-Octets}:-0}'::bigint),
    '%{Calling-Station-Id}',
    '%{Acct-Terminate-Cause}',
    NULLIF('%{Framed-IP-Address}', '')::text,
    '%{%{NAS-IPv6-Address}:-%{NAS-IP-Address}}',
    NULLIF('%{NAS-Identifier}', ''),
    CURRENT_TIMESTAMP
) 
ON CONFLICT ("orgId", "acctSessionId") 
DO NOTHING
```

---

### 9. Accounting On/Off

**Purpose:** Handle NAS reboot scenarios - terminate all sessions for a NAS.

**Strategy 1: Bulk Update (immediate termination):**
```sql
UPDATE ${acct_table1} 
SET 
    AcctStopTime = TO_TIMESTAMP(%{event_timestamp_epoch}),
    AcctUpdateTime = TO_TIMESTAMP(%{event_timestamp_epoch}),
    AcctSessionTime = (%{event_timestamp_epoch} - EXTRACT(EPOCH FROM(AcctStartTime))),
    AcctTerminateCause = '%{%{Acct-Terminate-Cause}:-NAS-Reboot}' 
WHERE AcctStopTime IS NULL 
AND NASIPAddress = '%{%{NAS-IPv6-Address}:-%{NAS-IP-Address}}' 
AND AcctStartTime <= TO_TIMESTAMP(%{event_timestamp_epoch})
```

**Strategy 2: Lightweight (record reload time):**
```sql
INSERT INTO nasreload (NASIPAddress, ReloadTime) 
VALUES ('%{NAS-IP-Address}', TO_TIMESTAMP(%{event_timestamp_epoch})) 
ON CONFLICT (NASIPAddress) 
DO UPDATE SET 
    ReloadTime = TO_TIMESTAMP(%{event_timestamp_epoch})
```

---

## Simultaneous Use Checking Queries

### 10. Simultaneous Count Query

**Purpose:** Count active sessions for a user to enforce concurrent login limits.

```sql
SELECT COUNT(id) 
FROM wf_radius_session a 
LEFT OUTER JOIN nasreload n ON a."nasIpAddress" = n.NASIPAddress 
WHERE "userName" = '%{SQL-User-Name}' 
AND "stoppedAt" IS NULL 
AND (a."startedAt" > n.ReloadTime OR n.ReloadTime IS NULL)
```

**Logic:** Counts sessions where:
- Username matches
- Session is still active (no stop time)
- NAS hasn't been reloaded since session started

---

### 11. Simultaneous Verify Query

**Purpose:** Retrieve details of active sessions for verification.

```sql
SELECT id, "acctSessionId", "userName", "nasIpAddress", '0', "framedIpAddress", "callingStationId", 'prot' 
FROM wf_radius_session a 
LEFT OUTER JOIN nasreload n ON a."nasIpAddress" = n.nasipaddress 
WHERE "userName" = '%{SQL-User-Name}' 
AND "stoppedAt" IS NULL 
AND (a."startedAt" > n.reloadtime OR n.reloadtime IS NULL)
```

---

## Group Membership Queries

### 12. Group Membership Query

**Purpose:** Determine group membership based on credential's station binding.

```sql
SELECT COALESCE(s.code, 'default') as GroupName 
FROM wf_credential c 
LEFT JOIN wf_station s ON c."stationId" = s.id 
WHERE (c.token = '%{SQL-User-Name}' OR c.username = '%{SQL-User-Name}') 
AND c.status IN ('SOLD', 'ACTIVATED') 
AND (c."expiresAt" IS NULL OR c."expiresAt" > CURRENT_TIMESTAMP) 
AND c."revokedAt" IS NULL 
AND c."deletedAt" IS NULL
```

**Logic:**
- Matches by token (voucher) or username
- Only returns active credentials that are sold or activated
- Excludes expired, revoked, or deleted credentials
- Returns station code as group name, or 'default' if no station绑定

---

## IP Pool Management Queries

### 13. IP Pool Allocation (Stored Procedure)

**Purpose:** Allocate an IP address from a pool, reusing previous address if available.

**Stored Procedure:** `fr_allocate_previous_or_new_framedipaddress`

```sql
CREATE OR REPLACE FUNCTION fr_allocate_previous_or_new_framedipaddress (
    v_pool_name VARCHAR(64),
    v_username VARCHAR(64),
    v_callingstationid VARCHAR(64),
    v_nasipaddress VARCHAR(16),
    v_pool_key VARCHAR(64),
    v_lease_duration INT
)
RETURNS inet
LANGUAGE plpgsql
AS $$
DECLARE
    r_address inet;
BEGIN
    -- Try to reissue existing IP for re-authentication
    SELECT framedipaddress INTO r_address
    FROM radippool
    WHERE pool_name = v_pool_name
        AND expiry_time > NOW()
        AND username = v_username
        AND callingstationid = v_callingstationid
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no existing lease, allocate least recently used
    IF r_address IS NULL THEN
        SELECT framedipaddress INTO r_address
        FROM radippool
        WHERE pool_name = v_pool_name
        AND expiry_time < NOW()
        ORDER BY expiry_time
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
    END IF;

    -- Return NULL if allocation failed
    IF r_address IS NULL THEN
        RETURN r_address;
    END IF;

    -- Update pool entry with new lease
    UPDATE radippool
    SET
        nasipaddress = v_nasipaddress,
        pool_key = v_pool_key,
        callingstationid = v_callingstationid,
        username = v_username,
        expiry_time = NOW() + v_lease_duration * interval '1 sec'
    WHERE framedipaddress = r_address;

    RETURN r_address;
END
$$;
```

**Parameters:**
- `v_pool_name`: Name of the IP pool
- `v_username`: User identifier
- `v_callingstationid`: Client MAC address
- `v_nasipaddress`: NAS IP address
- `v_pool_key`: Unique key for this allocation
- `v_lease_duration`: Lease duration in seconds

---

## Post-Authentication Queries

### 14. Post-Auth Insert Query

**Purpose:** Log authentication attempts to the database.

```sql
INSERT INTO radpostauth (
    username, pass, reply, authdate
) VALUES(
    '%{User-Name}',
    '%{%{User-Password}:-%{Chap-Password}}',
    '%{reply:Packet-Type}',
    '%S.%M'
)
```

---

### 15. Credential Activation Query

**Purpose:** Update credential activation timestamp on successful authentication.

```sql
UPDATE wf_credential 
SET 
    "activatedAt" = CURRENT_TIMESTAMP,
    status = CASE 
        WHEN status = 'SOLD' THEN 'ACTIVATED'::"CredentialStatus" 
        ELSE status 
    END,
    "updatedAt" = CURRENT_TIMESTAMP 
WHERE (token = '%{User-Name}' OR username = '%{User-Name}') 
AND "activatedAt" IS NULL 
AND status IN ('SOLD', 'ACTIVATED') 
AND "deletedAt" IS NULL 
AND '%{reply:Packet-Type}' = 'Access-Accept'
```

**Logic:**
- Activates credentials that were in 'SOLD' status
- Only updates if authentication was successful (Access-Accept)
- Prevents re-activation of already active credentials

---

## Database Views

The system uses PostgreSQL views to map FreeRADIUS table names to the volo database schema:

### 16. radcheck View

Maps to `wf_credential` for authentication check items.

```sql
CREATE OR REPLACE VIEW radcheck AS
SELECT
    id,
    COALESCE(token, username) as UserName,
    CASE
        WHEN type = 'VOUCHER_TOKEN' THEN 'Cleartext-Password'
        WHEN "passwordHash" IS NOT NULL THEN 'Crypt-Password'
        ELSE 'Cleartext-Password'
    END as Attribute,
    CASE
        WHEN type = 'VOUCHER_TOKEN' THEN token
        ELSE "passwordHash"
    END as Value,
    ':=' as op
FROM wf_credential
WHERE status IN ('SOLD', 'ACTIVATED')
AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
AND "revokedAt" IS NULL
AND "deletedAt" IS NULL;
```

---

### 17. radreply View

Maps to `wf_credential` for authorization reply items.

```sql
CREATE OR REPLACE VIEW radreply AS
SELECT
    id,
    COALESCE(token, username) as UserName,
    'Service-Type' as Attribute,
    'Framed-User' as Value,
    ':=' as op
FROM wf_credential
WHERE status IN ('SOLD', 'ACTIVATED')
AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
AND "revokedAt" IS NULL
AND "deletedAt" IS NULL;
```

---

### 18. radusergroup View

Maps to `wf_credential` with station binding for group membership.

```sql
CREATE OR REPLACE VIEW radusergroup AS
SELECT
    c.id,
    COALESCE(c.token, c.username) as UserName,
    COALESCE(s.code, 'default') as GroupName,
    0 as priority
FROM wf_credential c
LEFT JOIN wf_station s ON c."stationId" = s.id
WHERE c.status IN ('SOLD', 'ACTIVATED')
AND (c."expiresAt" IS NULL OR c."expiresAt" > CURRENT_TIMESTAMP)
AND c."revokedAt" IS NULL
AND c."deletedAt" IS NULL;
```

---

### 19. radacct View

Maps to `wf_radius_session` for backward compatibility.

```sql
CREATE OR REPLACE VIEW radacct AS
SELECT
    "acctSessionId"::text as AcctSessionId,
    "acctSessionId"::text as AcctUniqueId,
    "userName" as UserName,
    NULL::text as Realm,
    "nasIpAddress"::inet as NASIPAddress,
    NULL::text as NASPortId,
    NULL::text as NASPortType,
    "startedAt" as AcctStartTime,
    "lastInterimAt" as AcctUpdateTime,
    "stoppedAt" as AcctStopTime,
    NULL::bigint as AcctInterval,
    "sessionTimeSec"::bigint as AcctSessionTime,
    NULL::text as AcctAuthentic,
    NULL::text as ConnectInfo_start,
    NULL::text as ConnectInfo_stop,
    "inputBytes"::bigint as AcctInputOctets,
    "outputBytes"::bigint as AcctOutputOctets,
    NULL::text as CalledStationId,
    "callingStationId"::text as CallingStationId,
    "terminateCause"::text as AcctTerminateCause,
    NULL::text as ServiceType,
    NULL::text as FramedProtocol,
    "framedIpAddress"::inet as FramedIPAddress,
    NULL::inet as FramedIPv6Address,
    NULL::inet as FramedIPv6Prefix,
    NULL::text as FramedInterfaceId,
    NULL::inet as DelegatedIPv6Prefix,
    NULL::text as Class
FROM wf_radius_session;
```

---

### 20. nas View

Maps to `wf_station` for NAS devices.

```sql
CREATE OR REPLACE VIEW nas AS
SELECT
    id,
    "radiusClientIp"::text as nasname,
    code as shortname,
    'other'::text as type,
    NULL::integer as ports,
    "radiusSecret"::text as secret,
    NULL::text as server,
    NULL::text as community,
    name::text as description
FROM wf_station
WHERE "radiusClientIp" IS NOT NULL
AND status != 'DISABLED'
AND "deletedAt" IS NULL;
```

---

## Table Schemas

### 21. radippool Table

Stores allocated IP addresses for dynamic IP assignment.

```sql
CREATE TABLE radippool (
    id              BIGSERIAL PRIMARY KEY,
    pool_name       text NOT NULL,
    FramedIPAddress INET NOT NULL,
    NASIPAddress    text NOT NULL default '',
    pool_key        text NOT NULL default '',
    CalledStationId text NOT NULL default '',
    CallingStationId text NOT NULL default ''::text,
    expiry_time     TIMESTAMP(0) without time zone NOT NULL default NOW(),
    username        text DEFAULT ''::text
);

CREATE INDEX radippool_poolname_expire ON radippool USING btree (pool_name, expiry_time);
CREATE INDEX radippool_framedipaddress ON radippool USING btree (framedipaddress);
CREATE INDEX radippool_nasip_poolkey_ipaddress ON radippool USING btree (nasipaddress, pool_key, framedipaddress);
```

---

### 22. dhcpippool Table

DHCP IP pool for dynamic IP address management.

```sql
CREATE TYPE dhcp_status AS ENUM ('dynamic', 'static', 'declined', 'disabled');

CREATE TABLE dhcpippool (
    id              BIGSERIAL PRIMARY KEY,
    pool_name       varchar(64) NOT NULL,
    FramedIPAddress INET NOT NULL,
    pool_key        VARCHAR(64) NOT NULL default '0',
    gateway         VARCHAR(16) NOT NULL default '',
    expiry_time     TIMESTAMP(0) without time zone NOT NULL default NOW(),
    status          dhcp_status DEFAULT 'dynamic',
    counter         INT NOT NULL default 0
);

CREATE INDEX dhcpippool_poolname_expire ON dhcpippool USING btree (pool_name, expiry_time);
CREATE INDEX dhcpippool_framedipaddress ON dhcpippool USING btree (framedipaddress);
CREATE INDEX dhcpippool_poolname_poolkey_ipaddress ON dhcpippool USING btree (pool_name, pool_key, framedipaddress);
```

---

### 23. nasreload Table

Tracks NAS reload times for session management.

```sql
CREATE TABLE IF NOT EXISTS nasreload (
    NASIPAddress    inet PRIMARY KEY,
    ReloadTime      timestamp with time zone NOT NULL
);
```

---

### 24. radpostauth Table

Stores post-authentication logging data.

```sql
CREATE TABLE IF NOT EXISTS radpostauth (
    id              bigserial PRIMARY KEY,
    username        text NOT NULL,
    pass            text,
    reply           text,
    CalledStationId text,
    CallingStationId text,
    authdate        timestamp with time zone NOT NULL default now(),
    Class           text
);

CREATE INDEX radpostauth_username_idx ON radpostauth (username);
CREATE INDEX radpostauth_class_idx ON radpostauth (Class);
```

---

## Disconnect (CoA) Related Queries

### 25. Session Query for Disconnect by Username

**Purpose:** Find active sessions for a user to enable forced disconnect (Disconnect-Request).

```sql
SELECT 
    id, 
    "acctSessionId", 
    "userName", 
    "nasIpAddress", 
    "framedIpAddress", 
    "callingStationId" 
FROM wf_radius_session 
WHERE "userName" = '%{User-Name}' 
AND "stoppedAt" IS NULL
AND "orgId" = '%{Volo-Org-Id}'
```

**Parameters:**
- `User-Name`: Username to disconnect
- `Volo-Org-Id`: Organization ID

**Use Case:** Used by CoA/Disconnect-Request handler to terminate all active sessions for a specific user.

---

### 26. Session Query for Disconnect by Session ID

**Purpose:** Find a specific session by Acct-Session-Id for targeted disconnect.

```sql
SELECT 
    id, 
    "acctSessionId", 
    "userName", 
    "nasIpAddress", 
    "framedIpAddress", 
    "callingStationId" 
FROM wf_radius_session 
WHERE "acctSessionId" = '%{Acct-Session-Id}' 
AND "stoppedAt" IS NULL
AND "orgId" = '%{Volo-Org-Id}'
```

**Parameters:**
- `Acct-Session-Id`: Specific session identifier

**Use Case:** Used to disconnect a specific session when multiple sessions exist for the same user.

---

### 27. Session Query for Disconnect by MAC Address

**Purpose:** Find active sessions by Calling-Station-Id (MAC address).

```sql
SELECT 
    id, 
    "acctSessionId", 
    "userName", 
    "nasIpAddress", 
    "framedIpAddress", 
    "callingStationId" 
FROM wf_radius_session 
WHERE "callingStationId" = '%{Calling-Station-Id}' 
AND "stoppedAt" IS NULL
AND "orgId" = '%{Volo-Org-Id}'
```

**Parameters:**
- `Calling-Station-Id`: Client MAC address

**Use Case:** Used to disconnect all sessions from a specific device (MAC address).

---

### 28. Force Session Stop Query

**Purpose:** Manually terminate an active session (used by disconnect handlers).

```sql
UPDATE wf_radius_session 
SET 
    "stoppedAt" = CURRENT_TIMESTAMP,
    status = 'STOP'::"RadiusAcctStatus",
    "terminateCause" = 'Admin-Reset',
    "updatedAt" = CURRENT_TIMESTAMP 
WHERE "orgId" = '%{Volo-Org-Id}' 
AND "acctSessionId" = '%{Acct-Session-Id}' 
AND "stoppedAt" IS NULL
```

**Parameters:**
- `Volo-Org-Id`: Organization ID
- `Acct-Session-Id`: Session to terminate

**Note:** This query sets `terminateCause` to 'Admin-Reset' indicating administrative forced disconnect.

---

### 29. Daily Counter Query (Session Time Tracking)

**Purpose:** Calculate total session time used by a user within a time period (for quota enforcement).

```sql
SELECT SUM("sessionTimeSec" - GREATEST(%{period_start} - EXTRACT(epoch FROM "startedAt"), 0)) 
FROM wf_radius_session 
WHERE "userName" = '%{${key}}' 
AND (EXTRACT(epoch FROM "startedAt") + "sessionTimeSec") > %{period_start}
```

**Parameters:**
- `key`: Username attribute
- `period_start`: Start of the counting period (epoch timestamp)

**Use Case:** Used by the `dailycounter`, `weeklycounter`, and `monthlycounter` modules to enforce time-based quotas.

---

### 30. Expire on Login Query

**Purpose:** Check existing session time on login to expire old sessions.

```sql
SELECT EXTRACT(EPOCH FROM (NOW() - "startedAt")) 
FROM wf_radius_session 
WHERE "userName" = '%{${key}}' 
ORDER BY "startedAt" 
LIMIT 1;
```

**Parameters:**
- `key`: Username attribute

**Use Case:** Used to determine if a user's previous session should be expired when they log in again (single session enforcement).

---

### 31. NAS Reload Close Sessions (Batch Procedure)

**Purpose:** Batch close sessions affected by NAS reload after the fact.

```sql
-- Stored Procedure: fr_radacct_close_after_reload()
-- This procedure should be called periodically (e.g., via cron)

CREATE OR REPLACE PROCEDURE fr_radacct_close_after_reload ()
LANGUAGE plpgsql
AS $$
DECLARE v_a bigint;
DECLARE v_z bigint;
DECLARE v_updated bigint DEFAULT 0;
DECLARE v_batch_size CONSTANT integer := 2500;
BEGIN
    SELECT MIN(RadAcctId) INTO v_a FROM radacct WHERE AcctStopTime IS NULL;

    LOOP
        v_z := NULL;
        SELECT RadAcctId INTO v_z FROM radacct WHERE RadAcctId > v_a ORDER BY RadAcctId OFFSET v_batch_size LIMIT 1;

        IF v_z IS NULL THEN
            SELECT MAX(RadAcctId) INTO v_z FROM radacct;
        END IF;

        UPDATE radacct a
        SET
            AcctStopTime = n.reloadtime,
            AcctSessionTime = EXTRACT(EPOCH FROM (n.ReloadTime - a.AcctStartTime)),
            AcctTerminateCause = 'NAS reboot'
        FROM nasreload n
        WHERE
            a.NASIPAddress = n.NASIPAddress
            AND RadAcctId BETWEEN v_a AND v_z
            AND AcctStopTime IS NULL
            AND AcctStartTime < n.ReloadTime;

        COMMIT;
        v_a := v_z + 1;
        EXIT WHEN v_z IS NULL;
    END LOOP;
END
$$;
```

**Use Case:** Used in conjunction with the "lightweight" Accounting-On/Off strategy to close sessions that were interrupted by a NAS reboot.

---

### 32. Data Usage by Period Query

**Purpose:** Track per-user data usage over arbitrary time periods.

```sql
-- Stored Procedure: fr_new_data_usage_period()
-- Creates aggregated data usage records for reporting

CREATE OR REPLACE FUNCTION fr_new_data_usage_period ()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE v_start timestamp;
DECLARE v_end timestamp;
BEGIN
    SELECT COALESCE(MAX(period_end) + INTERVAL '1 SECOND', TO_TIMESTAMP(0)) INTO v_start;
    SELECT DATE_TRUNC('second',CURRENT_TIMESTAMP) INTO v_end;

    -- Add data usage for sessions active in current period
    INSERT INTO data_usage_by_period (username, period_start, period_end, acctinputoctets, acctoutputoctets)
    SELECT username, v_start, v_end, 
           SUM(acctinputoctets), SUM(acctoutputoctets)
    FROM radacct
    WHERE acctstoptime > v_start OR acctstoptime IS NULL
    GROUP BY username
    ON CONFLICT ON CONSTRAINT data_usage_by_period_pkey
    DO UPDATE SET
        acctinputoctets = data_usage_by_period.acctinputoctets + EXCLUDED.acctinputoctets,
        acctoutputoctets = data_usage_by_period.acctoutputoctets + EXCLUDED.acctoutputoctets,
        period_end = v_end;
END
$$;
```

---

## Disconnect Commands (radclient)

### Using radclient to send Disconnect-Request

After updating the database, you must send a Disconnect-Request to the NAS to force the client to disconnect.

#### By Username:
```bash
radclient -r 3 -t 5 <NAS_IP>:3799 disconnect <SECRET> \
  "User-Name=<username>" \
  "NAS-IP-Address=<NAS_IP>"
```

#### By Session ID:
```bash
radclient -r 3 -t 5 <NAS_IP>:3799 disconnect <SECRET> \
  "Acct-Session-Id=<session_id>" \
  "NAS-IP-Address=<NAS_IP>"
```

#### By MAC Address:
```bash
radclient -r 3 -t 5 <NAS_IP>:3799 disconnect <SECRET> \
  "Calling-Station-Id=<MAC_ADDRESS>" \
  "NAS-IP-Address=<NAS_IP>"
```

**Parameters:**
- `-r 3`: Retry 3 times
- `-t 5`: Timeout 5 seconds
- `-x`: Debug mode (optional)
- `<NAS_IP>`: IP address of the Ruijie NAS
- `<SECRET>`: Shared secret from clients.conf
- Port 3799: Default CoA/Disconnect port

---

### Example: Complete Disconnect Workflow

```bash
#!/bin/bash
# 1. Update database to mark session as stopped
psql -h localhost -U radius -d radius -c \
  "UPDATE wf_radius_session SET stoppedAt = NOW(), status = 'STOP', terminateCause = 'Admin-Reset' WHERE userName = '$1' AND stoppedAt IS NULL;"

# 2. Send Disconnect-Request to NAS
radclient -r 3 -t 5 103.81.113.65:3799 disconnect testing123 \
  "User-Name=$1" \
  "NAS-IP-Address=103.81.113.65"
```

---

## Query Configuration Variables

The following variables are used throughout the queries:

| Variable                | Default Value                            | Description                |
| ----------------------- | ---------------------------------------- | -------------------------- |
| `sql_user_name`         | `%{User-Name}`                           | Username for SQL queries   |
| `event_timestamp_epoch` | `%{%{integer:Event-Timestamp}:-%l}`      | Unix timestamp             |
| `event_timestamp`       | `TO_TIMESTAMP(${event_timestamp_epoch})` | SQL timestamp              |
| `client_table`          | `nas`                                    | NAS client table           |
| `authcheck_table`       | `radcheck`                               | Authorization check table  |
| `authreply_table`       | `radreply`                               | Authorization reply table  |
| `groupcheck_table`      | `radgroupcheck`                          | Group check table          |
| `groupreply_table`      | `radgroupreply`                          | Group reply table          |
| `usergroup_table`       | `radusergroup`                           | User group table           |
| `acct_table1`           | `radacct`                                | Primary accounting table   |
| `acct_table2`           | `radacct`                                | Secondary accounting table |
| `postauth_table`        | `radpostauth`                            | Post-authentication table  |

---

## Enumeration Types

The system uses PostgreSQL enum types for status tracking:

```sql
-- Credential Status
enum CredentialStatus {
    NEW
    SOLD
    ACTIVE
    EXPIRED
    REVOKED
    CONSUMED
    ACTIVATED
}

-- RADIUS Accounting Status
enum RadiusAcctStatus {
    START
    INTERIM
    STOP
}

-- Station Status
enum StationStatus {
    ACTIVE
    MAINTENANCE
    DISABLED
}
```

---

## Query Execution Flow

### Authentication Flow
1. `authorize_check_query` - Retrieve password/credentials
2. `authorize_reply_query` - Retrieve authorization attributes
3. `group_membership_query` - Determine group membership
4. `authorize_group_check_query` - Get group check items
5. `authorize_group_reply_query` - Get group reply items

### Accounting Flow
1. **Start:** `accounting.start.query` - Insert new session
2. **Interim:** `accounting.interim-update.query` - Update session stats
3. **Stop:** `accounting.stop.query` - Close session and record final stats
4. **On/Off:** `accounting.accounting-on.query` - Handle NAS reboot

### Post-Authentication Flow
1. `post-auth query` - Log authentication attempt
2. `post-auth query` (update) - Activate credential if needed

---

## File Locations

| File              | Path                                                      |
| ----------------- | --------------------------------------------------------- |
| Main Queries      | `raddb/mods-config/sql/main/postgresql/queries.conf`      |
| Schema            | `raddb/mods-config/sql/main/postgresql/schema.sql`        |
| Setup             | `raddb/mods-config/sql/main/postgresql/setup.sql`         |
| IP Pool Schema    | `raddb/mods-config/sql/ippool/postgresql/schema.sql`      |
| IP Pool Procedure | `raddb/mods-config/sql/ippool/postgresql/procedure.sql`   |
| DHCP Pool Schema  | `raddb/mods-config/sql/ippool-dhcp/postgresql/schema.sql` |
| Prisma Schema     | `volo.prisma`                                             |

---

*Document generated for Volo Wifi Station Management System - PostgreSQL/Radius Integration*
