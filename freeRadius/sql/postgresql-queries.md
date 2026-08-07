# FreeRADIUS PostgreSQL queries (Volo)

Source of truth: `freeRadius/raddb/mods-config/sql/main/postgresql/queries.conf`

Use this file to re-check queries against `volo_wifi_db` (`psql` / TablePlus / DBeaver).

---

## Console pages → tables (what FreeRADIUS actually uses)

| Console page | Primary tables | Used by FreeRADIUS? |
| --- | --- | --- |
| **Network → Plan RADIUS Policies** | `wf_plan_radius_attribute`, `wf_plan`, `wf_radius_vendor_profile`, `wf_station` | **Yes** — authorize REPLY / CHECK attrs |
| **Sites → Network tab** (`RADIUS vendor profile`) | `wf_station.radius_vendor_profile_id` | **Yes** — picks MikroTik vs Ruijie policy bundle |
| **Catalog → Retail Pricing** | `wf_plan_price_book`, `wf_plan_price`, `wf_plan_price_book_station`, `wf_plan_price_book_reseller` | **No** — sell price only (Reseller → Site → Org default) |
| **Partners → Plan entitlements** | reseller plan sellable flags + price-book resolution | **No** — commerce only |
| Credentials / vouchers | `wf_credential` (+ `wf_plan`) | **Yes** — password + plan + optional `station_id` |
| Live sessions | `wf_radius_session` | **Yes** — accounting + Simultaneous-Use |

### Plan RADIUS Policies model (matches the UI)

Each policy group in the UI is:

`plan` + `vendor profile` + scope (`All sites` **or** a site override)

Stored as rows in `wf_plan_radius_attribute`:

| Column | Meaning |
| --- | --- |
| `plan_id` | Service plan (e.g. P02 Staff 30 Days) |
| `vendor_profile_id` | MikroTik Hotspot **or** Ruijie EG Gateway (required) |
| `wifi_station_id` | `NULL` = plan-wide (“All sites”); set = site override |
| `phase` | `REPLY` (sent to NAS) or `CHECK` (authorize checks) |
| `"attributeName"` | e.g. `Session-Timeout`, `Mikrotik-Rate-Limit`, `WISPr-Bandwidth-Max-Down` |
| `policy_bundle_id` | Groups rows that belong to one console policy card |

**Resolution rule FreeRADIUS must follow**

1. Find credential by token/username → its `plan_id` (+ optional `station_id`).
2. Join site: `wf_station` via `credential.station_id`.
3. Keep attributes where:
   - `phase` matches (`REPLY` / `CHECK`)
   - station scope: `wifi_station_id IS NULL` **or** equals credential station
   - vendor: station has no `radius_vendor_profile_id` **or** `pra.vendor_profile_id = ws.radius_vendor_profile_id`
4. Prefer **site override** over plan-wide when the same `"attributeName"` appears twice.

Example from UI: site **Mikrotik Test** (`ST-MIKROTIK-TEST`) with vendor profile **Ruijie EG Gateway** must receive Ruijie `WISPr-*` attrs, **not** `Mikrotik-Rate-Limit`.

### Retail Pricing (not in FreeRADIUS)

Price books (`Standard Retail`, site books, reseller books) affect **what partners pay when selling** vouchers. They never appear in Access-Accept. Do not join `wf_plan_price*` in RADIUS SQL.

---

## How to test in `psql`

Replace placeholders:

| Placeholder | Example |
| --- | --- |
| Token / username | `'CKFAGG'` |
| Calling-Station-Id | `'AA:BB:CC:DD:EE:FF'` |
| NAS IP | `'10.0.0.1'` |
| Acct-Session-Id | `'8123456789'` |

Prefer `SELECT` / `EXPLAIN` first. Avoid production `UPDATE`/`INSERT` unless intentional.

Config defaults:

- `sql_user_name = %{User-Name}`
- `event_timestamp = TO_TIMESTAMP(${event_timestamp_epoch})`

---

## 0. Inspect policy data (from Plan RADIUS Policies UI)

```sql
-- Policy groups as the console shows them (plan + vendor + scope)
SELECT
  p.code AS plan_code,
  p.name AS plan_name,
  vp.name AS vendor_profile,
  vp.vendor,
  CASE
    WHEN pra.wifi_station_id IS NULL THEN 'All sites (global)'
    ELSE COALESCE(ws.code, pra.wifi_station_id)
  END AS scope,
  pra.phase,
  pra."attributeName",
  pra.op,
  pra.value,
  pra.priority,
  pra.policy_bundle_id
FROM wf_plan_radius_attribute pra
JOIN wf_plan p ON p.id = pra.plan_id AND p.deleted_at IS NULL
JOIN wf_radius_vendor_profile vp ON vp.id = pra.vendor_profile_id
LEFT JOIN wf_station ws ON ws.id = pra.wifi_station_id AND ws.deleted_at IS NULL
WHERE pra.deleted_at IS NULL
ORDER BY p.code, vp.name, scope, pra.phase, pra.priority, pra."attributeName";
```

```sql
-- Site Network tab: which vendor profile will FreeRADIUS use?
SELECT
  code,
  name,
  status,
  radius_vendor_profile_id,
  radius_client_ip,
  nas_identifier,
  portal_base_url
FROM wf_station
WHERE deleted_at IS NULL
  AND code = 'ST-MIKROTIK-TEST';
```

---

## 1. Client query (`client_query`)

Failsafe: zero rows. NAS allowlist is `clients.conf` (`client any`); `read_clients = no`.

```sql
SELECT
  NULL::integer AS id,
  NULL::text AS nasname,
  NULL::text AS shortname,
  NULL::text AS type,
  NULL::text AS secret,
  NULL::text AS server
WHERE false;
```

---

## 2. Authorize — check items (`authorize_check_query`)

Password / token + `Simultaneous-Use` from plan `max_devices`. **Does not** read Plan RADIUS Policies.

```sql
SELECT id, username AS "UserName", attribute AS "Attribute", value AS "Value", op AS "Op"
FROM (
  SELECT
    1 AS sort_key,
    c.id AS id,
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
  WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
    AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
    AND c."status" IN ('SOLD', 'ACTIVATED')
    AND c.deleted_at IS NULL
    AND c.revoked_at IS NULL
    AND (
      (c.username IS NOT NULL AND c.password_hash IS NOT NULL)
      OR c.token IS NOT NULL
    )
  UNION ALL
  SELECT
    2 AS sort_key,
    c.id AS id,
    COALESCE(c.username, c.token) AS username,
    'Simultaneous-Use' AS attribute,
    ':=' AS op,
    COALESCE(p.max_devices, 1)::text AS value
  FROM wf_credential c
  INNER JOIN wf_plan p ON c.plan_id = p.id AND p.deleted_at IS NULL
  WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
    AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
    AND c."status" IN ('SOLD', 'ACTIVATED')
    AND c.deleted_at IS NULL
    AND c.revoked_at IS NULL
) combined
ORDER BY sort_key, id;
```

Empty result ⇒ wrong token / status / expired / deleted.

---

## 3. Authorize — reply items (`authorize_reply_query`)

**This is the FreeRADIUS view of Plan RADIUS Policies (REPLY phase).**

Filters:

- `pra.phase = 'REPLY'`
- station scope (global or matching `credential.station_id`)
- vendor profile = site’s `radius_vendor_profile_id` (when set)
- `DISTINCT ON ("attributeName")` preferring site override, then priority

```sql
SELECT
  ROW_NUMBER() OVER (ORDER BY deduped.priority ASC, deduped.pra_id)::integer AS id,
  deduped."UserName",
  deduped."Attribute",
  deduped."Value",
  deduped."Op"
FROM (
  SELECT DISTINCT ON (pra."attributeName")
    COALESCE(c.username, c.token) AS "UserName",
    pra."attributeName" AS "Attribute",
    CASE
      WHEN pra.op IN (':=','=','==','+=','-=','!=','>','>=','<','<=','=~','!~','=*','!*') THEN pra.op
      ELSE ':='
    END AS "Op",
    CASE
      WHEN (pra.value IS NULL OR pra.value = '')
        AND pra.op NOT IN (':=','=','==','+=','-=','!=','>','>=','<','<=','=~','!~','=*','!*')
        THEN pra.op
      WHEN pra.value LIKE '%{timeSeconds}%' THEN
        REPLACE(
          pra.value,
          '{timeSeconds}',
          COALESCE(
            c."timeRemainingSec"::text,
            (p.time_amount *
              CASE p.time_unit
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
          COALESCE(c.data_remaining_mb::text, p.data_mb::text, '0')
        )
      ELSE pra.value
    END AS "Value",
    pra.priority AS priority,
    pra.id AS pra_id
  FROM wf_credential c
  INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
  LEFT JOIN wf_station ws ON ws.id = c.station_id AND ws.deleted_at IS NULL
  INNER JOIN wf_plan_radius_attribute pra ON pra.plan_id = p.id
    AND pra.phase = 'REPLY'
    AND pra.deleted_at IS NULL
    AND (
      pra.wifi_station_id IS NULL
      OR (c.station_id IS NOT NULL AND pra.wifi_station_id = c.station_id)
    )
    AND (
      ws.radius_vendor_profile_id IS NULL
      OR pra.vendor_profile_id = ws.radius_vendor_profile_id
    )
  WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
    AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
    AND c.deleted_at IS NULL
    AND c.revoked_at IS NULL
    AND c."status" IN ('SOLD', 'ACTIVATED')
  ORDER BY
    pra."attributeName",
    CASE WHEN pra.wifi_station_id IS NOT NULL THEN 0 ELSE 1 END,
    pra.priority ASC,
    pra.id
) deduped
ORDER BY deduped.priority ASC, deduped.pra_id;
```

**Expect for a Ruijie-profile site:** `Session-Timeout`, `Idle-Timeout`, `Acct-Interim-Interval`, `WISPr-Bandwidth-Max-*` — **not** `Mikrotik-Rate-Limit`.

**If `credential.station_id` is NULL** and the site has no vendor on a join, vendor filter is skipped (`ws.radius_vendor_profile_id IS NULL`) and both vendor bundles can compete — bind vouchers to the selling site, or set the site vendor profile.

Debug helpers:

```sql
-- Credential → plan → site → vendor
SELECT
  c.token,
  c.username,
  c.status,
  c.station_id,
  p.code AS plan_code,
  ws.code AS station_code,
  ws.radius_vendor_profile_id,
  vp.name AS vendor_profile
FROM wf_credential c
JOIN wf_plan p ON p.id = c.plan_id
LEFT JOIN wf_station ws ON ws.id = c.station_id
LEFT JOIN wf_radius_vendor_profile vp ON vp.id = ws.radius_vendor_profile_id
WHERE c.token = 'CKFAGG' OR c.username = 'CKFAGG';
```

---

## 4. Group membership (`group_membership_query`)

Group name = `plan.code || COALESCE(username, token)`.

```sql
SELECT p.code || COALESCE(c.username, c.token) AS groupname
FROM wf_credential c
INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
  AND (c.username IS NOT NULL OR c.token IS NOT NULL)
  AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
  AND c.deleted_at IS NULL
ORDER BY 1;
```

Paste returned `groupname` into §5.

---

## 5. Authorize — group check (`authorize_group_check_query`)

CHECK-phase rows from the same Plan RADIUS Policies table (same station + vendor rules).

```sql
SELECT
  ROW_NUMBER() OVER (ORDER BY deduped.priority ASC, deduped.pra_id)::integer AS id,
  deduped."GroupName",
  deduped."Attribute",
  deduped."Value",
  deduped."Op"
FROM (
  SELECT DISTINCT ON (pra."attributeName")
    p.code || COALESCE(c.username, c.token) AS "GroupName",
    pra."attributeName" AS "Attribute",
    CASE
      WHEN pra.op IN (':=','=','==','+=','-=','!=','>','>=','<','<=','=~','!~','=*','!*') THEN pra.op
      ELSE '=='
    END AS "Op",
    pra.value AS "Value",
    pra.priority AS priority,
    pra.id AS pra_id
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
      ws.radius_vendor_profile_id IS NULL
      OR pra.vendor_profile_id = ws.radius_vendor_profile_id
    )
  WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
    AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
    AND c.deleted_at IS NULL
    AND (p.code || COALESCE(c.username, c.token)) = 'PASTE_GROUPNAME_HERE'
  ORDER BY
    pra."attributeName",
    CASE WHEN pra.wifi_station_id IS NOT NULL THEN 0 ELSE 1 END,
    pra.priority ASC,
    pra.id
) deduped
ORDER BY deduped.priority ASC, deduped.pra_id;
```

---

## 6. Authorize — group reply (`authorize_group_reply_query`)

Empty on purpose — REPLY already comes from §3.

```sql
SELECT
  NULL::integer AS id,
  NULL::varchar(128) AS "GroupName",
  NULL::varchar(64) AS "Attribute",
  NULL::varchar(253) AS "Value",
  NULL::varchar(2) AS op
WHERE false;
```

---

## 7. Simultaneous-Use count (`simul_count_query`)

Open sessions for the user **excluding** the same Calling-Station-Id.

```sql
SELECT COUNT(id)
FROM wf_radius_session a
WHERE user_name = 'CKFAGG'
  AND stopped_at IS NULL
  AND (
    a."callingStationId" IS NULL
    OR UPPER(REPLACE(REPLACE(a."callingStationId", ':', ''), '-', ''))
      <> UPPER(REPLACE(REPLACE('AA:BB:CC:DD:EE:FF', ':', ''), '-', ''))
  );
```

---

## 8. Simultaneous-Use verify (`simul_verify_query`)

```sql
SELECT
  id,
  acct_session_id,
  user_name,
  nas_ip_address,
  '0',
  framed_ip_address,
  "callingStationId",
  'prot'
FROM wf_radius_session a
WHERE user_name = 'CKFAGG'
  AND stopped_at IS NULL
  AND (
    a."callingStationId" IS NULL
    OR UPPER(REPLACE(REPLACE(a."callingStationId", ':', ''), '-', ''))
      <> UPPER(REPLACE(REPLACE('AA:BB:CC:DD:EE:FF', ':', ''), '-', ''))
  );
```

---

## 9. Accounting — Accounting-On / Off

```sql
-- Preview
SELECT id, user_name, acct_session_id, nas_ip_address, started_at, status
FROM wf_radius_session
WHERE stopped_at IS NULL
  AND nas_ip_address = '10.0.0.1';

-- Mutates rows (as FreeRADIUS does)
UPDATE wf_radius_session
SET
  stopped_at = TO_TIMESTAMP(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
  last_interim_at = TO_TIMESTAMP(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
  "sessionTimeSec" = (
    EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM started_at)
  )::integer,
  terminate_cause = 'NAS-Reboot',
  status = 'STOP'::"RadiusAcctStatus",
  updated_at = CURRENT_TIMESTAMP
WHERE stopped_at IS NULL
  AND nas_ip_address = '10.0.0.1'
  AND started_at <= TO_TIMESTAMP(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP));
```

---

## 10. Accounting — Start

Resolves `org_id` / `station_id` / `credential_id` from `wf_credential` (same credential row as authorize).

### 10a. UPDATE open row

```sql
UPDATE wf_radius_session
SET
  user_name = 'CKFAGG',
  started_at = TO_TIMESTAMP(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
  last_interim_at = TO_TIMESTAMP(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)),
  status = 'START'::"RadiusAcctStatus",
  "callingStationId" = 'AA:BB:CC:DD:EE:FF',
  framed_ip_address = NULLIF('192.168.88.10', '')::text,
  nas_identifier = NULLIF('hotspot1', ''),
  org_id = COALESCE(wf_radius_session.org_id, (
    SELECT c.org_id FROM wf_credential c
    WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
      AND c.deleted_at IS NULL LIMIT 1)),
  station_id = COALESCE(wf_radius_session.station_id, (
    SELECT c.station_id FROM wf_credential c
    WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
      AND c.deleted_at IS NULL LIMIT 1)),
  credential_id = COALESCE(wf_radius_session.credential_id, (
    SELECT c.id FROM wf_credential c
    WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
      AND c.deleted_at IS NULL LIMIT 1)),
  updated_at = CURRENT_TIMESTAMP
WHERE acct_session_id = '8123456789'
  AND nas_ip_address = '10.0.0.1'
  AND stopped_at IS NULL;
```

### 10b. INSERT … ON CONFLICT

See `queries.conf` → `accounting.type.start` second `query`.

```sql
SELECT c.id, c.org_id, c.station_id, c.token, c.username, c.status
FROM wf_credential c
WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
  AND c.deleted_at IS NULL
LIMIT 1;
```

---

## 11–12. Interim-Update / Stop

Same `wf_radius_session` keys: `(acct_session_id, nas_ip_address)`. Full SQL in `queries.conf`. Preview:

```sql
SELECT id, status, started_at, last_interim_at, stopped_at,
       "sessionTimeSec", "inputBytes", "outputBytes", "callingStationId"
FROM wf_radius_session
WHERE acct_session_id = '8123456789'
  AND nas_ip_address = '10.0.0.1';
```

---

## 13. Accounting — no Acct-Status-Type

```sql
SELECT true;
```

---

## 14. Post-auth

### 14a. Insert into `${postauth_table}` (often `radpostauth`)

Confirm table name in `mods-available/sql` before inserting.

### 14b. Activate credential on Access-Accept

```sql
SELECT id, token, username, status, activated_at
FROM wf_credential
WHERE (token = 'CKFAGG' OR username = 'CKFAGG')
  AND (activated_at IS NULL OR status = 'SOLD')
  AND status IN ('SOLD', 'ACTIVATED')
  AND deleted_at IS NULL
  AND revoked_at IS NULL;

UPDATE wf_credential
SET
  activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
  status = CASE
    WHEN status = 'SOLD' THEN 'ACTIVATED'::"CredentialStatus"
    ELSE status
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE (token = 'CKFAGG' OR username = 'CKFAGG')
  AND (activated_at IS NULL OR status = 'SOLD')
  AND status IN ('SOLD', 'ACTIVATED')
  AND deleted_at IS NULL
  AND revoked_at IS NULL;
```

---

## Auth debug checklist (policy-related)

1. §0 — plan has REPLY rows for the expected vendor profile  
2. Site Network tab — `radius_vendor_profile_id` matches that vendor  
3. Credential — `station_id` points at that site (else vendor filter may not apply)  
4. §2 — password/check rows exist  
5. §3 — reply attrs are the **correct vendor** (Ruijie vs MikroTik)  
6. §7 — Simultaneous-Use not blocking  

**Authorize status gate:** §2 / §3 / post-auth only accept `SOLD` and `ACTIVATED`.  
`CONSUMED`, `PAUSED`, `REVOKED`, `EXPIRED` → **0 rows** (Access-Reject). That is intentional, not missing policy data.

```sql
-- Per-token FreeRADIUS readiness (replace MNV758)
SELECT
  c.token,
  c.status::text AS status,
  c.activated_at,
  c.expires_at,
  c.revoked_at,
  c.deleted_at,
  p.code AS plan_code,
  ws.code AS station_code,
  vp.name AS vendor_profile,
  CASE
    WHEN c.deleted_at IS NOT NULL THEN 'FAIL: deleted'
    WHEN c.revoked_at IS NOT NULL OR c.status = 'REVOKED' THEN 'FAIL: revoked'
    WHEN c.status = 'PAUSED' THEN 'FAIL: paused'
    WHEN c.status = 'EXPIRED'
      OR (c.expires_at IS NOT NULL AND c.expires_at <= CURRENT_TIMESTAMP)
      THEN 'FAIL: expired'
    WHEN c.status = 'CONSUMED' THEN 'FAIL: consumed (quota used)'
    WHEN c.status NOT IN ('SOLD', 'ACTIVATED') THEN 'FAIL: status not authorizable'
    ELSE 'OK: would pass authorize status filter'
  END AS authorize_status,
  (
    SELECT COUNT(*)::int
    FROM wf_plan_radius_attribute pra
    WHERE pra.plan_id = c.plan_id
      AND pra.phase = 'REPLY'
      AND pra.deleted_at IS NULL
      AND (
        pra.wifi_station_id IS NULL
        OR (c.station_id IS NOT NULL AND pra.wifi_station_id = c.station_id)
      )
      AND (
        ws.radius_vendor_profile_id IS NULL
        OR pra.vendor_profile_id = ws.radius_vendor_profile_id
      )
  ) AS reply_attr_count
FROM wf_credential c
JOIN wf_plan p ON p.id = c.plan_id
LEFT JOIN wf_station ws ON ws.id = c.station_id AND ws.deleted_at IS NULL
LEFT JOIN wf_radius_vendor_profile vp ON vp.id = ws.radius_vendor_profile_id
WHERE c.token = 'MNV758' OR c.username = 'MNV758';
```

```sql
SELECT id, user_name, status, "callingStationId", nas_ip_address,
       started_at, last_interim_at, stopped_at, terminate_cause,
       "sessionTimeSec"
FROM wf_radius_session
WHERE user_name = 'MNV758'
ORDER BY started_at DESC
LIMIT 20;
```

---

## Column name notes (live DB)

Some Prisma fields kept **camelCase** columns in Postgres (legacy):

| Table | Column as used in SQL |
| --- | --- |
| `wf_plan_radius_attribute` | `"attributeName"` |
| `wf_credential` | `"timeRemainingSec"`, `data_remaining_mb` |
| `wf_radius_session` | `"callingStationId"`, `"sessionTimeSec"`, `"inputBytes"`, `"outputBytes"`, `"totalBytes"` |

---

## Tables touched by FreeRADIUS

| Table | Role |
| --- | --- |
| `wf_credential` | Auth identity, plan, station, activate |
| `wf_plan` | Quotas / `max_devices` / time templates |
| `wf_plan_radius_attribute` | **Plan RADIUS Policies** UI |
| `wf_station` | Vendor profile + optional site overrides |
| `wf_radius_vendor_profile` | MikroTik / Ruijie profile metadata (via FK) |
| `wf_radius_session` | Accounting + Simultaneous-Use |
| postauth table | Optional auth log |

**Not used by FreeRADIUS:** `wf_plan_price_book`, `wf_plan_price`, `wf_plan_price_book_station`, `wf_plan_price_book_reseller` (Retail Pricing / partner sell price).

Related schema dump: `freeRadius/sql/postgresql-schema.sql`.
