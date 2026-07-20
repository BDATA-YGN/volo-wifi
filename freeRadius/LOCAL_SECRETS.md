# Local secrets (DO NOT COMMIT / DO NOT SHARE)

This file is generated/maintained to make it easy to re-check the secrets used in this repo.

It is listed in `.gitignore` so it stays local to your machine / server.

## FreeRADIUS shared secrets

- **`raddb/clients.conf` global/default client secret**
  - **Value**: `PM2UAr1P/j48jxS+4p4bkfmqAlF/GQcTM0HryRXaGBU=`

- **`raddb/clients.conf` `client any` (catch-all `0.0.0.0/0`, UDP only, Message-Authenticator required)**
  - **Value**: `qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY`

- **`raddb/clients.conf` `client localhost_ipv6`**
  - **Value**: `fYAi5MeatybNLJ8NWYALt7zhOw0sQIN/f478LAcbbWg=`

- **`raddb/clients.conf` `client private-network-1` (ipaddr `129.224.202.214`, shortname `ruijie`)**
  - **Value**: `GkLN57TjU1U4//vM1pX1vjJHCNSIe33jxyqwsgwd35Q=`

- **`raddb/proxy.conf` home server shared secret**
  - **Value**: `NBbk/HJhFBUHAHL2IFUzeq/QN6KIlwECnb6ST1eYN2o=`

- **`raddb/templates.conf` `home_server_pool example_com` template secret**
  - **Value**: `V4wYXLl+IfwDVBKg0vSIkxOCGaTlvSX7tQSm7oRPBGE=`

- **`raddb/sites-available/originate-coa` `home_server example-coa`**
  - **Value**: `mSs/YHzFlg291EUW3N4p6qzlj5k8nTc56nev0JlFma0=`

- **`raddb/sites-available/coa-relay` `home_server coa-nas1`**
  - **Value**: `v1VAgUnj9EwiAQmfHRikBblOEhsbuc+Wbg+cavr4Ekg=`

- **`raddb/sites-available/status` `client admin`**
  - **Value**: `3VYPkLjALFk4nTlcOjFbWHeNaAQldCKGWXJGqRNb+Uw=`

- **`raddb/sites-available/example` example client secrets**
  - **`client 192.0.2.10`**: `gS+IMNZbB8NwZrfSYirfOgfNwrs1q5BsRkCkXWNkQZM=`
  - **`client 192.0.2.9`**: `4HTHdWyz+qpMNMO4OGXWJFc5cLWq27uqw+FVonmJJ+4=`

- **`raddb/sites-available/robust-proxy-accounting` home server secrets**
  - **`home1.example.com`**: `gS+IMNZbB8NwZrfSYirfOgfNwrs1q5BsRkCkXWNkQZM=`
  - **`home2.example.com`**: `4HTHdWyz+qpMNMO4OGXWJFc5cLWq27uqw+FVonmJJ+4=`

## SQL (PostgreSQL) credentials used by FreeRADIUS

- **`raddb/mods-available/sql` `password`**
  - **Value**: `LqHbX2RNs6ZhISXDYo+tlOhAVggB5MCuWVNUkmaUjwY=`

## Notes

- `raddb/sites-available/tls` uses the conventional shared secret `radsec` for RadSec examples; that value is not changed here because the file’s own docs indicate it may be required/assumed for TLS examples.

