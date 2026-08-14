# =============================================================================
# MRU001-restore.rsc — LEGACY (10.10.10.0/24)
# Use volo-hotspot-restore.rsc for new installs (172.16.0.0/24, volo-hotspot naming)
# =============================================================================
# Device: MikroTik hEX S RB760iGS | RouterOS 7.20+
# Site MRU001 | NAS MRUI001 | Guest SSID MRU-Wifi (external AP on ether2)
# Portal: https://portal.volowifi.com/auth
# RADIUS: 68.183.181.73:1812/1813 | Secret: MRUI001
# =============================================================================
#
# BEFORE IMPORT
#   1. Recommended: /system reset-configuration no-defaults=yes skip-backup=yes
#   2. Upload docs/hotspot/ contents → router folder flash/hotspot/
#      (login.html redirects to portal; alogin.html → /dashboard)
#   3. AP: bridge mode, DHCP off, cable to ether2
#
# IMPORT
#   /import file-name=MRU001-restore.rsc
#
# AFTER IMPORT
#   If device-mode asks for reboot → /system reboot
#   Verify: /ip hotspot print detail where name=mru001-hotspot
#   Test phone: http://neverssl.com → portal.volowifi.com/auth
#
# NOTES
#   - RouterOS 7 requires device-mode hotspot=yes (fixes INVALID)
#   - No separate DHCP server on Hotspot interface (Hotspot uses address-pool)
#   - No dns-name / login-url (external portal via flash/hotspot/login.html)
#   - Input firewall (below): guest → ROUTER only (not their internet)
#     HTTP 80/443 = Hotspot serves login.html (captive redirect)
#     DNS 53 = clients use 10.10.10.1 as DNS (must allow or portal hostname fails)
#     DHCP 67 = clients get 10.10.10.x IP
#     Drop = block guest access to router Winbox/SSH on other ports
#     Guest internet uses forward chain + Hotspot (separate from input rules)
# =============================================================================

/system device-mode update hotspot=yes

/interface bridge
add name=bridge-mru001 comment="MRU001 guest LAN"

/interface bridge port
add bridge=bridge-mru001 interface=ether2 comment="MRU001 AP"
add bridge=bridge-mru001 interface=ether3 comment="MRU001 LAN"

/ip address
add address=10.10.10.1/24 interface=bridge-mru001 network=10.10.10.0

/ip pool
add name=mru001-pool ranges=10.10.10.10-10.10.10.254

/ip dhcp-server network
add address=10.10.10.0/24 dns-server=10.10.10.1 gateway=10.10.10.1

/ip dhcp-client
add interface=ether1 comment="MRU001 WAN"

/ip dns
set allow-remote-requests=yes

/ip hotspot profile
add hotspot-address=10.10.10.1 html-directory=flash/hotspot \
    http-cookie-lifetime=1d login-by=cookie,http-chap,http-pap name=\
    mru001-profile nas-port-type=ethernet radius-accounting=yes \
    radius-interim-update=5m use-radius=yes

/ip hotspot
add address-pool=mru001-pool disabled=no interface=bridge-mru001 name=\
    mru001-hotspot profile=mru001-profile

/radius
add address=68.183.181.73 authentication-port=1812 accounting-port=1813 \
    comment=MRUI001 secret=qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY service=hotspot \
    timeout=3s

/radius incoming
set accept=yes port=3799

/ip hotspot walled-garden ip
add action=accept dst-host=portal-v2.volowifi.com
add action=accept comment=MRU001-api dst-host=portal-api.volowifi.com
add action=accept comment=MRU001-dns-udp dst-port=53 protocol=udp
add action=accept comment=MRU001-dns-tcp dst-port=53 protocol=tcp

/ip firewall nat
add action=masquerade chain=srcnat comment=MRU001-nat out-interface=ether1 \
    src-address=10.10.10.0/24

/ip firewall filter
add action=accept chain=input comment=MRU001-http dst-port=80 \
    in-interface=bridge-mru001 protocol=tcp
add action=accept chain=input comment=MRU001-https dst-port=443 \
    in-interface=bridge-mru001 protocol=tcp
add action=accept chain=input comment=MRU001-dns-udp dst-port=53 \
    in-interface=bridge-mru001 protocol=udp
add action=accept chain=input comment=MRU001-dns-tcp dst-port=53 \
    in-interface=bridge-mru001 protocol=tcp
add action=accept chain=input comment=MRU001-dhcp dst-port=67 \
    in-interface=bridge-mru001 protocol=udp
add action=drop chain=input comment=MRU001-drop-guest \
    in-interface=bridge-mru001 src-address=10.10.10.0/24
