# MRU001-fix.rsc — Run AFTER restore if no portal + no internet
# Fixes: allow DNS/DHCP to router on input (was blocked by drop rule)
# Import: /import file-name=MRU001-fix.rsc

/ip firewall filter remove [find comment~"MRU001-hotspot"]
/ip firewall filter remove [find comment~"MRU001-block-guest"]
/ip firewall filter remove [find comment~"MRU001-dns-input"]
/ip firewall filter remove [find comment~"MRU001-dhcp-input"]

# Allow Hotspot + DNS + DHCP to router FROM guest (order matters — before drop)
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=80 in-interface=bridge-mru001 comment=MRU001-hotspot-http
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=443 in-interface=bridge-mru001 comment=MRU001-hotspot-https
/ip firewall filter add chain=input action=accept protocol=udp dst-port=53 in-interface=bridge-mru001 comment=MRU001-dns-input-udp
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=53 in-interface=bridge-mru001 comment=MRU001-dns-input-tcp
/ip firewall filter add chain=input action=accept protocol=udp dst-port=67 in-interface=bridge-mru001 comment=MRU001-dhcp-input
/ip firewall filter add chain=input action=drop src-address=10.10.10.0/24 in-interface=bridge-mru001 comment=MRU001-block-guest-input

# Remove old forward bypass rules if still present from init-backup
/ip firewall filter remove [find chain=forward in-interface=bridge-mru001 out-interface=ether1]
/ip firewall filter remove [find chain=forward in-interface=bridge-mru001 action=drop]

# Refresh Hotspot firewall chains
/ip hotspot disable mru001-hotspot
/ip hotspot enable mru001-hotspot

:put "MRU001-fix done. Forget WiFi, reconnect, open http://neverssl.com"
