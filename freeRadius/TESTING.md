# Testing Guide with NTRadPing

This guide explains how to test the FreeRADIUS server using **NTRadPing**, a popular tool for simulating RADIUS packets.

## 1. Prepare the Server

Before testing, run the RADIUS server in debug mode to see real-time packet processing and SQL query execution.

```bash
docker run -it --rm --network host \
  -v $(pwd)/raddb:/etc/raddb \
  freeradius/freeradius-server:latest -X
```

## 2. NTRadPing Configuration

Launch NTRadPing and configure the following parameters:

| Field             | Value                                    |
| :---------------- | :--------------------------------------- |
| **RADIUS Server** | `127.0.0.1` (or server IP)               |
| **RADIUS Port**   | `1812` (Auth) or `1813` (Acct)           |
| **RADIUS Secret** | `testing123` (from `raddb/clients.conf`) |
| **User Name**     | A valid username in your database        |
| **Password**      | The user's password                      |

## 3. Testing Authentication (Access-Request)

Authentication is now backed by the `wf_credential` table.

### 3.1 Prepare Test Data

Create at least one credential row in PostgreSQL:

```sql
INSERT INTO wf_credential (
  id, "orgId", type, status, "planId", token, username, "passwordHash",
  "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'test-org-id',
  'VOUCHER_TOKEN',              -- or another CredentialType you use
  'SOLD',                       -- will be accepted and auto-activated
  'some-plan-id',
  'TESTTOKEN123',               -- token login
  'testuser',                   -- username login
  'cleartext-or-crypt-hash-here',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

Key rules enforced by the SQL queries:

- `status` must be `'SOLD'` or `'ACTIVATED'`
- `"expiresAt"` must be `NULL` or in the future
- `"revokedAt"` and `"deletedAt"` must be `NULL`

### 3.2 Token-Based Authentication (using `token` as username/password)

1. In NTRadPing, set **Request Type** to `Access-Request`.
2. Set **User Name** to the credential token, e.g. `TESTTOKEN123`.
3. Set **Password** to the same token value `TESTTOKEN123`.
4. Click **Send**.
5. **Success**:
   - NTRadPing shows `Access-Accept`.
   - FreeRADIUS debug logs show a `SELECT` from `wf_credential`.
6. **Database verification**:

   ```sql
   SELECT id, status, "activatedAt", "updatedAt"
   FROM wf_credential
   WHERE token = 'TESTTOKEN123';
   ```

   - On first successful auth, `status` should change from `SOLD` → `ACTIVATED`
   - `"activatedAt"` should be set to the current timestamp.

### 3.3 Username / Password Authentication (using `username` + `passwordHash`)

If you use `username` + `passwordHash` instead of tokens:

1. Create a `wf_credential` row where:
   - `username` = `testuser`
   - `"passwordHash"` contains a hash compatible with FreeRADIUS (e.g. `Crypt-Password` format).
2. In NTRadPing:
   - **User Name**: `testuser`
   - **Password**: the cleartext password that matches `"passwordHash"`.
3. Click **Send**.
4. **Success**: `Access-Accept` in NTRadPing and matching SQL lookups in debug logs.
5. **Failure**: Check for:
   - Wrong password
   - `status` not in `('SOLD','ACTIVATED')`
   - Expired (`"expiresAt"` in the past) or revoked/deleted credentials.

## 4. Testing Accounting (Accounting-Request)

To test the custom `wf_radius_session` table, you MUST include the `Volo-Org-Id` attribute.

### Step A: Configure Attributes
In NTRadPing, add the following attribute in the **Attributes** box:
```text
Volo-Org-Id = your-org-id-here
```

### Step B: Start Session
1. Set **Request Type** to `Accounting-Request`.
2. Set **Acct-Status-Type** to `Start`.
3. Click **Send**.
4. **Verification**: Check your database: `SELECT * FROM wf_radius_session WHERE "acctSessionId" = '...';`

### Step C: Interim Update
1. Change **Acct-Status-Type** to `Interim-Update`.
2. Add **Acct-Session-Time** (e.g., `60`).
3. Click **Send**.
4. **Verification**: `lastInterimAt` and `sessionTimeSec` should update.

### Step D: Stop Session
1. Change **Acct-Status-Type** to `Stop`.
2. Add **Acct-Terminate-Cause** (e.g., `User-Request`).
3. Click **Send**.
4. **Verification**: `stoppedAt` should be populated and `status` set to `STOP`.

## Troubleshooting

- **No Response**: Verify `clients.conf` has a client for your IP and the secret matches.
- **SQL Error**: If the server logs show SQL errors, ensure the `pgcrypto` extension is enabled in PostgreSQL (`CREATE EXTENSION pgcrypto;`).
- **Missing Attr**: If `orgId` is null in the database, ensure `Volo-Org-Id` is being sent in the packet.
