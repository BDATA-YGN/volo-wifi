# FreeRADIUS PostgreSQL queries (Volo)

Source of truth: `freeRadius/raddb/mods-config/sql/main/postgresql/queries.conf`

Use this file to re-check queries against `volo_wifi_db` (`psql` / TablePlus / DBeaver).

---

## Console pages → tables (what FreeRADIUS actually uses)

| Console page | Primary tables | Used by FreeRADIUS? |
| --- | --- | --- |
| **Network → Plan RADIUS Policies** | `wf_plan_radius_attribute`, `wf_plan`, `wf_radius_vendor_profile`, `wf_station` | **Yes** — authorize **REPLY** attrs (`read_groups = no`; CHECK unused) |
| **Sites → Network tab** (`RADIUS vendor profile`) | `wf_station.radius_vendor_profile_id` | **Yes** — picks MikroTik vs Ruijie policy bundle |
| **Catalog → Retail Pricing** | `wf_plan_price_book`, `wf_plan_price`, `wf_plan_price_book_station`, `wf_plan_price_book_reseller` | **No** — sell price only |
| **Partners → Plan entitlements** | reseller plan sellable flags + price-book resolution | **No** — commerce only |
| Credentials / vouchers | `wf_credential` (+ `wf_plan`) | **Yes** — password + Simultaneous-Use + activate |
| Live sessions | `wf_radius_session` | **Yes** — accounting + Simultaneous-Use |
| Auth log | `radpostauth` | **Yes** — post-auth insert only |

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
- PG session `timezone=Asia/Yangon` (`radius_db` `options=-ctimezone=Asia/Yangon` + compose `PGTZ`)
- DateTime columns are **`timestamptz`** (absolute instants; Prisma `@db.Timestamptz`)
- `event_timestamp = TO_TIMESTAMP(${event_timestamp_epoch})` — stores timestamptz directly
- `CURRENT_TIMESTAMP` for `updated_at` / `activated_at` / `expires_at` checks
- `EXTRACT(EPOCH FROM started_at)` is correct on timestamptz

### Timezone

Session TZ Asia/Yangon only affects display of `NOW()` / timestamptz in SQL tools.
Stored values are absolute; the console formats with `Asia/Yangon` via dayjs.

FreeRADIUS `radius_db` uses **keyword/value** conninfo, not a PostgreSQL URI. Do not use
URI percent-encoding (`options=-c%20timezone%3D…`) — that makes libpq pass a literal junk
GUC name and PostgreSQL fails with `FATAL: … requires a value`, so the `sql` module never
starts and every Access-Request fails. Correct form: `options=-ctimezone=Asia/Yangon`.

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

Password / token + `Simultaneous-Use` from plan `max_devices` (one credential/plan hit via `LATERAL VALUES`).

```sql
SELECT
  c.id::text AS id,
  COALESCE(c.username, c.token) AS "UserName",
  v.attribute AS "Attribute",
  v.value AS "Value",
  ':=' AS "Op"
FROM wf_credential c
INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
CROSS JOIN LATERAL (
  VALUES
    (
      CASE
        WHEN c.username IS NOT NULL AND c.password_hash IS NOT NULL THEN 'Crypt-Password'
        ELSE 'Cleartext-Password'
      END,
      CASE
        WHEN c.username IS NOT NULL AND c.password_hash IS NOT NULL THEN c.password_hash
        ELSE c.token
      END
    ),
    ('Simultaneous-Use', COALESCE(p.max_devices, 1)::text)
) AS v(attribute, value)
WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
  AND c."status" IN ('SOLD', 'ACTIVATED')
  AND c.deleted_at IS NULL
  AND c.revoked_at IS NULL
  AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
  AND (
    (c.username IS NOT NULL AND c.password_hash IS NOT NULL)
    OR c.token IS NOT NULL
  )
ORDER BY CASE WHEN v.attribute = 'Simultaneous-Use' THEN 2 ELSE 1 END, c.id;
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

Console stores `op = ':='` and a concrete `value` (optionally `{timeSeconds}` / `{dataMb}` templates). No FreeRADIUS operator whitelist is needed.

**`{timeSeconds}` expansion (cumulative):** remaining seconds = plan quota − SUM(`wf_radius_session` usage for this username/token), not a fresh full plan hour on every reconnect. Auth is rejected when remaining ≤ 0. Accounting STOP also writes `"timeRemainingSec"` and may mark `CONSUMED`.

```sql
SELECT
  deduped.pra_id AS id,
  deduped."UserName",
  deduped."Attribute",
  deduped."Value",
  deduped."Op"
FROM (
  SELECT DISTINCT ON (pra."attributeName")
    COALESCE(c.username, c.token) AS "UserName",
    pra."attributeName" AS "Attribute",
    COALESCE(NULLIF(pra.op, ''), ':=') AS "Op",
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
    END AS "Value",
    pra.priority AS priority,
    pra.id AS pra_id
  FROM wf_credential c
  INNER JOIN wf_plan p ON p.id = c.plan_id AND p.deleted_at IS NULL
  LEFT JOIN wf_station ws ON ws.id = c.station_id AND ws.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(
      CASE
        WHEN rs.stopped_at IS NOT NULL THEN
          COALESCE(
            rs."sessionTimeSec",
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (rs.stopped_at - rs.started_at))))::integer
          )
        ELSE
          GREATEST(
            COALESCE(rs."sessionTimeSec", 0),
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rs.started_at))))::integer
          )
      END
    ), 0)::integer AS used_sec
    FROM wf_radius_session rs
    WHERE (
      (c.username IS NOT NULL AND rs.user_name = c.username)
      OR (c.token IS NOT NULL AND (rs.user_name = c.token OR rs.user_name = UPPER(c.token)))
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
      ws.radius_vendor_profile_id IS NULL
      OR pra.vendor_profile_id = ws.radius_vendor_profile_id
    )
  WHERE (c.token = 'CKFAGG' OR c.username = 'CKFAGG')
    AND c."status" IN ('SOLD', 'ACTIVATED')
    AND c.deleted_at IS NULL
    AND c.revoked_at IS NULL
    AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
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

## 4–6. Group membership / group check / group reply

**Disabled in production:** `mods-available/sql` sets `read_groups = no` and `read_profiles = no`.

Reason: all Access-Accept REPLY attrs come from §3 (`authorize_reply_query`). Live DB has **0** CHECK-phase `wf_plan_radius_attribute` rows, so group queries were wasted round-trips.

`queries.conf` keeps empty stubs (`WHERE false`). To use CHECK-phase policies later:

1. Add CHECK rows in Plan RADIUS Policies  
2. Set `read_groups = yes`  
3. Restore real `group_membership_query` / `authorize_group_check_query` from git history  

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

Same `wf_radius_session` keys: `(acct_session_id, nas_ip_address)`. Full SQL in `queries.conf`.

Guards (leftover hotspot host / reused Acct-Session-Id):

- Start/Interim/Stop **never UPDATE a row that already has `stopped_at`**.
- On Start, a STOP'd row with the same `(acct_session_id, nas_ip_address)` is renamed (`:closed:<uuid>`) so a new session can INSERT.
- `Acct-Session-Time` **> 86400 (24h) and > 2× last-seen wall** is treated as a leftover-host / Session-Timeout copy and is **not stored**.
- A Stop/Interim **INSERT is skipped** when that leftover test fails (no new 15-day row on a 3-hour voucher).
- Authorize remaining-time SQL bills leftover NAS+wall (>24h both) as **0**, matching `billedSessionSeconds()`.

Preview:

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
| `wf_plan_radius_attribute` | Plan RADIUS Policies (**REPLY** phase) |
| `wf_station` | Vendor profile + optional site overrides |
| `wf_radius_vendor_profile` | MikroTik / Ruijie metadata (via FK) |
| `wf_radius_session` | Accounting + Simultaneous-Use |
| `radpostauth` | Auth attempt log |

**Not used:** `radcheck` / `radreply` / `radgroup*` / `radacct` / `nas` / `nasreload`, retail price books.

Related schema dump: `freeRadius/sql/postgresql-schema.sql`.
