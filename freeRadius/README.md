# volo-infra / FreeRADIUS

## Docker Compose

```sh
# Production (Dokploy / server)
docker compose up -d
docker compose logs -f freeradius

# Config syntax check + DB connection
docker compose logs freeradius 2>&1 | grep -E "Connected to database|Failed to connect|Error: rlm_sql"

# Debug (foreground, -X verbose)
docker compose -f docker-compose.yml -f docker-compose.debug.yml up

# Restart after raddb changes
docker compose down && docker compose up -d
```

## Layout

| Host path | Container path | Purpose |
|-----------|----------------|---------|
| `./raddb` | `/etc/raddb` | All FreeRADIUS config + `certs/do-ca-certificate.crt` |
| `freeradius-logs` volume | `/var/log/freeradius` | `radius.log`, `linelog-auth-YYYYMMDD`, etc. |

DB connection: edit `raddb/mods-available/sql` (`radius_db` with DO host + SSL). See `.env.example` for variable names (reference only).

## Testing (Docker)

Replace `VOUCHER` with a valid token from `wf_credential` (token = password).  
Shared secret below is from `raddb/clients.conf` → `client localhost` (for `127.0.0.1` only).

```sh
# Variables (adjust before running)
export VOUCHER=TU6IKI
export RADIUS_SECRET='PM2UAr1P/j48jxS+4p4bkfmqAlF/GQcTM0HryRXaGBU='
```

### Shell inside the container

```sh
docker exec -it freeradius bash
# if bash is missing:
docker exec -it freeradius sh
```

### 1. Config syntax check (no auth traffic)

Inside the container:

```sh
freeradius -C -d /etc/raddb
```

No output usually means OK.

### 2. Authentication test (`radtest`)

One-liner from the **host**:

```sh
docker exec freeradius radtest "$VOUCHER" "$VOUCHER" 127.0.0.1 0 "$RADIUS_SECRET"
```

Or inside the container:

```sh
radtest "$VOUCHER" "$VOUCHER" 127.0.0.1 0 "$RADIUS_SECRET"
```

| Argument | Meaning |
|----------|---------|
| 1st / 2nd | User-Name and User-Password (voucher token) |
| `127.0.0.1` | RADIUS server (same container) |
| `0` | NAS-Port |
| last arg | Shared secret from `client localhost` in `clients.conf` |

Expected: `Received Access-Accept`  
Reject: `Received Access-Reject`

### 3. Accounting test (`radclient`)

Inside the container:

```sh
echo "User-Name=$VOUCHER,Acct-Status-Type=Start,Acct-Session-Id=test-001" \
  | radclient -x 127.0.0.1:1813 acct "$RADIUS_SECRET"
```

Expected: `Received Accounting-Response`

### 4. Logs

Inside the container:

```sh
# Auth accept/reject (terminal / Dokploy logs) — no -X needed
docker compose logs -f freeradius

# Detailed reject reasons (daily file inside the volume)
docker exec freeradius sh -c 'tail -f /var/log/freeradius/linelog-auth-$(date +%Y%m%d)'
```

Log retention: `freeradius-log-cleanup` purges files older than 3 days in the `freeradius-logs` volume. Docker json logs are capped (`max-size` / `max-file` in compose). Production must **not** run `-X` (use `docker-compose.debug.yml` only when debugging).

**Dokploy:** Logs tab → select container **`freeradius`** only. Look for `Login OK`, `Login incorrect`, `ACCEPT`, or `REJECT`.

From the **host**:

```sh
docker compose logs -f freeradius
```

Check DB connection on startup:

```sh
docker compose logs freeradius 2>&1 | grep -E "Connected to database|rlm_sql|Error"
```

### 5. Debug mode (verbose)

Stop the production container, then:

```sh
docker compose -f docker-compose.yml -f docker-compose.debug.yml up
```

In another terminal, run `radtest` while watching the full authorize → sql → pap flow.

### Notes

| Topic | Detail |
|-------|--------|
| Secret | Must match the `client` entry for the source IP (`127.0.0.1` → `client localhost`) |
| Test user | Must exist in `wf_credential`, not expired, `deletedAt` NULL |
| From host via port `1812` | You may need a `client` block for the Docker gateway / host IP, not only `127.0.0.1` |
| Inside container | `127.0.0.1` works because `client localhost` is defined |

## One-off debug container

```sh
docker run --rm --network host \
  -v "$(pwd)/raddb:/etc/raddb" \
  freeradius/freeradius-server:3.2.8 -X -d /etc/raddb
```
