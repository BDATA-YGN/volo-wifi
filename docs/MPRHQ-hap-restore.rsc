# =============================================================================
# MPRHQ-hap-restore.rsc — MikroTik hAP (built-in WiFi), all-in-one
# Router ID / NAS-Identifier: MPRHQ
# SSID: MPRHQ-Wifi (open; auth via Hotspot)
# IPv4: 172.1.1.1/24 on guest bridge, WAN DHCP on ether1
# =============================================================================
# BEFORE IMPORT
#   1. /system reset-configuration no-defaults=yes skip-backup=yes
#   2. Reconnect Winbox by MAC. Upload hotspot/ (or docs/hotspot/) → flash/hotspot/
#      Must include login.html with NASID=$(identity). Then import this file.
#   3. When Terminal shows a countdown, UNPLUG POWER (not Winbox Reboot)
#
# NOTES
#   - Guest LAN 172.1.1.0/24, gateway/dns 172.1.1.1, pool 172.1.1.2-254
#   - Do NOT use 172.1.1.0 as host/hotspot-address (network address → Hotspot INVALID)
#   - DHCP server is on bridge-mprhq (not ether2) so WiFi gets leases
#   - device-mode hotspot=yes runs LAST so the rest of the import can finish
#   - Hotspot server name=MPRHQ so $(server-name) can fill NASID if $(identity) is empty
#   - Guest SSID is OPEN (no WPA). Do not add a WiFi password.
# =============================================================================

/system identity
set name=MPRHQ

/system clock
set time-zone-name=Asia/Yangon

/interface list
add name=WAN
add name=LAN

/interface list member
add interface=ether1 list=WAN

/interface bridge
add name=bridge-mprhq comment="MPRHQ guest LAN"

# Guest ethernet (skip ports this hardware does not have)
:foreach ifName in={"ether2";"ether3";"ether4";"ether5";"sfp1"} do={
    :if ([:len [/interface find name=$ifName]] > 0) do={
        /interface list member add interface=$ifName list=LAN
        /interface bridge port add bridge=bridge-mprhq interface=$ifName comment="MPRHQ LAN"
    }
}

# --- Built-in WiFi: legacy wireless (wlan1 / wlan2) ---
:if ([:len [/interface wireless find]] > 0) do={
    /interface wireless security-profiles set [find default=yes] mode=none
    :foreach i in=[/interface wireless find] do={
        :local n [/interface wireless get $i name]
        /interface wireless set $n mode=ap-bridge ssid="MPRHQ-Wifi" frequency=auto disabled=no
        :if ([:len [/interface list member find interface=$n]] = 0) do={
            /interface list member add interface=$n list=LAN
        }
        :if ([:len [/interface bridge port find interface=$n]] = 0) do={
            /interface bridge port add bridge=bridge-mprhq interface=$n comment="MPRHQ WiFi"
        }
    }
}

# --- Built-in WiFi: RouterOS 7 wifi package (wifi1 / wifi2) ---
:if ([:len [/interface wifi find]] > 0) do={
    :if ([:len [/interface wifi security find name="mprhq-open"]] = 0) do={
        /interface wifi security add name=mprhq-open authentication-types=""
    }
    :if ([:len [/interface wifi configuration find name="mprhq-guest"]] = 0) do={
        /interface wifi configuration add name=mprhq-guest ssid="MPRHQ-Wifi" \
            country=Myanmar security=mprhq-open
    }
    :foreach i in=[/interface wifi find] do={
        :local n [/interface wifi get $i name]
        /interface wifi set $n configuration=mprhq-guest disabled=no
        :if ([:len [/interface list member find interface=$n]] = 0) do={
            /interface list member add interface=$n list=LAN
        }
        :if ([:len [/interface bridge port find interface=$n]] = 0) do={
            /interface bridge port add bridge=bridge-mprhq interface=$n comment="MPRHQ WiFi"
        }
    }
}

/ip address
add address=172.1.1.1/24 interface=bridge-mprhq network=172.1.1.0

/ip pool
add name=dhcp ranges=172.1.1.2-172.1.1.254

/ip dhcp-server network
add address=172.1.1.0/24 dns-server=172.1.1.1 gateway=172.1.1.1 netmask=24

/ip dhcp-server
add name=mprhq-dhcp interface=bridge-mprhq address-pool=dhcp disabled=no \
    comment="MPRHQ guest DHCP (bridge, not ether2)"

/ip dhcp-client
add interface=ether1 comment="MPRHQ WAN"

/ip dns
set allow-remote-requests=yes

/ip neighbor discovery-settings
set discover-interface-list=!dynamic

/ip hotspot profile
add hotspot-address=172.1.1.1 html-directory=flash/hotspot \
    html-directory-override=flash/hotspot \
    http-cookie-lifetime=1d login-by=cookie,http-chap,http-pap name=\
    mprhq-profile nas-port-type=wireless-802.11 radius-accounting=yes \
    radius-interim-update=5m use-radius=yes

/ip hotspot
add address-pool=dhcp disabled=no interface=bridge-mprhq name=MPRHQ \
    profile=mprhq-profile

# Factory leftover DHCP on ether2 (or any non-bridge iface) will not serve WiFi
# and can steal pool "dhcp" so Hotspot cannot lease on the bridge.
:foreach ds in=[/ip dhcp-server find] do={
    :local ifName [/ip dhcp-server get $ds interface]
    :if ($ifName != "bridge-mprhq") do={
        /ip dhcp-server remove $ds
    }
}

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

# LAST — blocks Terminal until you physically unplug power or short-press Mode.
# Do NOT /system reboot. After power-on: /system device-mode print  (hotspot: yes)
/system device-mode update hotspot=yes
