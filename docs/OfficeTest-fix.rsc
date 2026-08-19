# OfficeTest-fix.rsc — patch on the live TEST backup (do not reset)
# Router identity must stay OfficeTest (NAS-Identifier).
# Upload to Files, then: /import file-name=OfficeTest-fix.rsc
#
# Does NOT set the RADIUS secret (exports omit it). After import:
#   /radius print
# If secret is empty, set the same value as NAS Devices in Volo.

/system clock
set time-zone-name=Asia/Yangon

/ip hotspot profile
set [find name=volo_profile] login-by=http-pap use-radius=yes \
    radius-accounting=yes radius-interim-update=5m html-directory=flash/hotspot

/radius
set [find address=159.223.63.109] authentication-port=1812 accounting-port=1813 \
    timeout=3s require-message-auth=no service=hotspot

/radius incoming
set accept=yes port=3799

# Hostname-only garden for portal-v2 (HTTP + IP). Safe to re-run.
/ip hotspot walled-garden remove [find comment~"volo-fix"]
/ip hotspot walled-garden ip remove [find comment~"volo-fix"]
/ip hotspot walled-garden ip remove [find comment~"MRU001-dns"]
/ip hotspot walled-garden ip remove [find dst-host="portal-v2.volowifi.com"]

/ip hotspot walled-garden
add dst-host=portal-v2.volowifi.com comment=volo-fix-portal-v2

/ip hotspot walled-garden ip
add action=accept dst-host=portal-v2.volowifi.com comment=volo-fix-portal-v2
add action=accept dst-host=portal.volowifi.com comment=volo-fix-portal
add action=accept protocol=udp dst-port=53 comment=volo-fix-dns-udp
add action=accept protocol=tcp dst-port=53 comment=volo-fix-dns-tcp

/ip hotspot cookie remove [find]

:put "OfficeTest-fix done. Check /radius print (secret) and reconnect a client."
