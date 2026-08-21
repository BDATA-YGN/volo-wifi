# =============================================================================
# MPRHQ-restore.rsc — RB760iGS (hEX S) + external AP on ether2
# Router ID / NAS-Identifier: MPRHQ
# IPv4: 172.1.1.1/24 on LAN, WAN DHCP on ether1
# For a hAP with built-in WiFi (no external AP), use MPRHQ-hap-restore.rsc
# and docs/MPRHQ.md instead.
# =============================================================================
# BEFORE IMPORT
#   1. Recommended: /system reset-configuration no-defaults=yes skip-backup=yes
#   2. Upload docs/hotspot/ → flash/hotspot/
#   3. AP: bridge mode, DHCP off, cable to ether2
#
# IMPORT
#   /import file-name=MPRHQ-restore.rsc
#
# NOTES
#   - Guest LAN 172.1.1.0/24, gateway/dns 172.1.1.1, pool 172.1.1.2-254
#   - Do NOT use 172.1.1.0 as host/hotspot-address (network address → Hotspot INVALID)
#   - No standalone /ip dhcp-server — Hotspot uses address-pool
#   - /system identity = MPRHQ must match Volo site NAS-Identifier
# =============================================================================

/system device-mode update hotspot=yes

/system identity
set name=MPRHQ

/system clock
set time-zone-name=Asia/Yangon

/interface list
add name=WAN
add name=LAN

/interface list member
add interface=ether1 list=WAN
add interface=ether2 list=LAN
add interface=ether3 list=LAN
add interface=ether4 list=LAN
add interface=ether5 list=LAN
add interface=sfp1 list=LAN

/interface bridge
add name=bridge-mprhq comment="MPRHQ guest LAN"

/interface bridge port
add bridge=bridge-mprhq interface=ether2 comment="MPRHQ AP"
add bridge=bridge-mprhq interface=ether3 comment="MPRHQ LAN"
add bridge=bridge-mprhq interface=ether4 comment="MPRHQ LAN"
add bridge=bridge-mprhq interface=ether5 comment="MPRHQ LAN"
add bridge=bridge-mprhq interface=sfp1 comment="MPRHQ LAN"

/ip address
add address=172.1.1.1/24 interface=bridge-mprhq network=172.1.1.0

/ip pool
add name=dhcp ranges=172.1.1.2-172.1.1.254

/ip dhcp-server network
add address=172.1.1.0/24 dns-server=172.1.1.1 gateway=172.1.1.1 netmask=24

/ip dhcp-client
add interface=ether1 comment="MPRHQ WAN"

/ip dns
set allow-remote-requests=yes

/ip neighbor discovery-settings
set discover-interface-list=!dynamic

/ip hotspot profile
add hotspot-address=172.1.1.1 html-directory=flash/hotspot \
    http-cookie-lifetime=1d login-by=cookie,http-chap,http-pap name=\
    mprhq-profile nas-port-type=ethernet radius-accounting=yes \
    radius-interim-update=5m use-radius=yes

/ip hotspot
add address-pool=dhcp disabled=no interface=bridge-mprhq name=\
    mprhq-hotspot profile=mprhq-profile

/radius
add address=159.223.63.109 authentication-port=1812 accounting-port=1813 \
    comment=MPRHQ secret=qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY service=hotspot \
    timeout=3s

/radius incoming
set accept=yes port=3799

/ip hotspot walled-garden ip
add action=accept dst-host=portal-v2.volowifi.com
add action=accept comment=MPRHQ-api dst-host=portal-api.volowifi.com
add action=accept comment=MPRHQ-dns-udp dst-port=53 protocol=udp
add action=accept comment=MPRHQ-dns-tcp dst-port=53 protocol=tcp

/ip firewall nat
add action=masquerade chain=srcnat comment=MPRHQ-nat out-interface-list=WAN \
    src-address=172.1.1.0/24

/ip firewall filter
add action=accept chain=input comment=MPRHQ-http dst-port=80 \
    in-interface=bridge-mprhq protocol=tcp
add action=accept chain=input comment=MPRHQ-https dst-port=443 \
    in-interface=bridge-mprhq protocol=tcp
add action=accept chain=input comment=MPRHQ-dns-udp dst-port=53 \
    in-interface=bridge-mprhq protocol=udp
add action=accept chain=input comment=MPRHQ-dns-tcp dst-port=53 \
    in-interface=bridge-mprhq protocol=tcp
add action=accept chain=input comment=MPRHQ-dhcp dst-port=67 \
    in-interface=bridge-mprhq protocol=udp
add action=drop chain=input comment=MPRHQ-drop-guest \
    in-interface=bridge-mprhq src-address=172.1.1.0/24
