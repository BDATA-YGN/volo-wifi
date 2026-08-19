#!/bin/sh
# Purge old FreeRADIUS log files so /var/log/freeradius cannot fill the disk.
#
# Usage:
#   docker exec freeradius sh /etc/raddb/scripts/cleanup-logs.sh
#   KEEP_DAYS=7 MAX_MB=50 docker exec -e KEEP_DAYS -e MAX_MB freeradius \
#     sh /etc/raddb/scripts/cleanup-logs.sh
#
# docker-compose service freeradius-log-cleanup runs this once per day.

set -eu

LOGDIR="${LOGDIR:-/var/log/freeradius}"
KEEP_DAYS="${KEEP_DAYS:-7}"
# Soft cap for radius.log / leftover undated files (MiB). Truncate if larger.
MAX_MB="${MAX_MB:-50}"

if [ ! -d "$LOGDIR" ]; then
	echo "cleanup-logs: $LOGDIR does not exist" >&2
	exit 1
fi

echo "cleanup-logs: LOGDIR=$LOGDIR KEEP_DAYS=$KEEP_DAYS MAX_MB=$MAX_MB"

deleted=0
# Daily-rotated linelog / detail files (no -print — keep Dokploy quiet)
deleted=$(find "$LOGDIR" -type f \( \
	-name 'linelog-auth-*' -o \
	-name 'linelog-accounting-*' -o \
	-name 'linelog-*' -o \
	-name 'detail-*' -o \
	-name 'auth-detail-*' -o \
	-name 'reply-detail-*' -o \
	-name 'pre-proxy-detail-*' -o \
	-name 'post-proxy-detail-*' -o \
	-name 'sqllog.sql*' \
\) -mtime +"$KEEP_DAYS" -print 2>/dev/null | wc -l | tr -d ' ')
find "$LOGDIR" -type f \( \
	-name 'linelog-auth-*' -o \
	-name 'linelog-accounting-*' -o \
	-name 'linelog-*' -o \
	-name 'detail-*' -o \
	-name 'auth-detail-*' -o \
	-name 'reply-detail-*' -o \
	-name 'pre-proxy-detail-*' -o \
	-name 'post-proxy-detail-*' -o \
	-name 'sqllog.sql*' \
\) -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

# Truncate unbounded single files if they exceed MAX_MB
for f in radius.log linelog-auth linelog-accounting linelog sqllog.sql; do
	path="$LOGDIR/$f"
	[ -f "$path" ] || continue
	# Portable size check (bytes)
	size=$(wc -c < "$path" | tr -d ' ')
	max=$((MAX_MB * 1024 * 1024))
	if [ "$size" -gt "$max" ]; then
		echo "cleanup-logs: truncating $path ($size bytes > ${MAX_MB}MiB)"
		: > "$path"
	fi
done

# radacct/ is leftover from the accounting `detail` module (now disabled).
# Sessions are already in PostgreSQL — purge the whole tree, not just old files.
radacct_deleted=0
if [ -d "$LOGDIR/radacct" ]; then
	radacct_deleted=$(find "$LOGDIR/radacct" -type f -print 2>/dev/null | wc -l | tr -d ' ')
	rm -rf "$LOGDIR/radacct"
fi

echo "cleanup-logs: done (removed ${deleted:-0} log files, ${radacct_deleted:-0} radacct detail files)"
