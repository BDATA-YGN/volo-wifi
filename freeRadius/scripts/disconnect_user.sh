#!/bin/bash
# disconnect_user.sh - Send Disconnect-Request to NAS to kill user session
# Usage: ./disconnect_user.sh <username> <nas_ip> <secret> [port]

USERNAME="$1"
NAS_IP="$2"
SECRET="$3"
PORT="${4:-3799}"

if [ -z "$USERNAME" ] || [ -z "$NAS_IP" ] || [ -z "$SECRET" ]; then
    echo "Usage: $0 <username> <nas_ip> <secret> [port]"
    echo "Example: $0 testuser 10.0.0.1 testing123"
    exit 1
fi

echo "Sending Disconnect-Request for user: $USERNAME to NAS: $NAS_IP"

radclient -r 3 -t 5 -x "$NAS_IP:$PORT" disconnect "$SECRET" \
    "User-Name=$USERNAME" \
    "NAS-IP-Address=$NAS_IP"

if [ $? -eq 0 ]; then
    echo "Disconnect request sent successfully"
    
    # Update database to mark session as stopped
    # psql -h localhost -U radius -d radius -c \
    #     "UPDATE wf_radius_session SET stoppedAt = NOW(), status = 'STOP', terminateCause = 'Admin-Reset' WHERE userName = '$USERNAME' AND stoppedAt IS NULL;"
else
    echo "Failed to send disconnect request"
    exit 1
fi
