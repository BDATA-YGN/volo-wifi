# DigitalOcean Managed PostgreSQL — CA certificate

## File location

| In repo | On server (after deploy) |
|---------|---------------------------|
| `raddb/certs/do-ca-certificate.crt` | `/etc/raddb/certs/do-ca-certificate.crt` |

This is the **CA certificate** from DigitalOcean → your database → **Connection details** → download CA.

FreeRADIUS uses it in `raddb/mods-available/sql`:

```
sslrootcert=${confdir}/certs/do-ca-certificate.crt
```

## Deploy (automatic)

`docker-compose.yml` mounts the whole `raddb` folder:

```yaml
volumes:
  - ./raddb:/etc/raddb
```

So every Git deploy (Dokploy AutoDeploy, manual `docker compose up`, etc.) copies this file into the container. **No extra copy step** is needed as long as the file is committed in Git.

## Manual install (no Docker)

```bash
sudo cp raddb/certs/do-ca-certificate.crt /etc/raddb/certs/
sudo chown root:freerad /etc/raddb/certs/do-ca-certificate.crt
sudo chmod 640 /etc/raddb/certs/do-ca-certificate.crt
```

Adjust group to `radiusd` if your distro uses that name.

## Rotate CA (when DO renews)

1. Download the new CA from the DO control panel.
2. Replace `raddb/certs/do-ca-certificate.crt` in the repo.
3. Commit, push, redeploy (or copy to the server and restart FreeRADIUS).

## Verify

```bash
freeradius -X
# look for:
# Connected to database 'volo_wifi_db' on '...ondigitalocean.com' ...
```

If you see `root certificate file ... does not exist`, check that `${confdir}/certs/do-ca-certificate.crt` exists and is readable by the freerad user.
