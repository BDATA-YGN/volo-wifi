# MRU001.rsc — Volo WiFi / MikroTik hEX Series Hotspot
# Models: hEX (RB750Gr3), hEX S (RB760iGS), hEX lite (RB750r2)
# Site: MRU001 | NAS: MRUI001 | SSID: MRU-Wifi (set on external AP)
# Portal: https://portal.volowifi.com/auth
# RADIUS: 68.183.181.73:1812/1813
# Hotspot GW / NAS IP: 10.10.10.1
#
# hEX has NO built-in WiFi. Connect WiFi AP to ether2 (bridge mode, no DHCP on AP).
# Set SSID "MRU-Wifi" on the AP. WAN = ether1.
#
# IMPORTANT — Captive portal redirect (RouterOS 7.x):
#   login-url is NOT supported on hotspot profile (CLI error at column 40).
#   Redirect ONLY via hotspot/login.html in html-directory=hotspot.
#   Upload docs/MRU001-hotspot/login.html to router Files/hotspot/ BEFORE testing WiFi.
#   See docs/MRU001-hotspot/README.md
#
# Import:  /import file-name=MRU001.rsc

# --- 1. Guest bridge (LAN side) ---
:if ([:len [/interface bridge find name="bridge-mru001"]] = 0) do={
    /interface bridge add name=bridge-mru001 comment="MRU001 guest hotspot LAN"
}

# --- 2. hEX ethernet ports → guest bridge (no wlan on hEX) ---
:if ([:len [/interface bridge port find interface=ether2]] = 0) do={
    /interface bridge port add bridge=bridge-mru001 interface=ether2 comment="MRU001 AP uplink"
}
:if ([:len [/interface bridge port find interface=ether3]] = 0) do={
    /interface bridge port add bridge=bridge-mru001 interface=ether3 comment="MRU001 LAN"
}
:if ([:len [/interface bridge port find interface=ether4]] = 0) do={
    /interface bridge port add bridge=bridge-mru001 interface=ether4 comment="MRU001 LAN"
}

# Ensure WAN is NOT on guest bridge
:if ([:len [/interface bridge port find interface=ether1]] > 0) do={
    /interface bridge port remove [find interface=ether1]
}

# --- 3. Hotspot gateway IP on guest bridge ---
:if ([:len [/ip address find address="10.10.10.1/24"]] = 0) do={
    /ip address add address=10.10.10.1/24 interface=bridge-mru001 comment="MRU001 hotspot GW"
}

# --- 4. DHCP pool (guest WiFi / wired clients on AP ports) ---
:if ([:len [/ip pool find name=mrui001-pool]] = 0) do={
    /ip pool add name=mrui001-pool ranges=10.10.10.2-10.10.10.254
}

# --- 4b. DHCP server on guest bridge (if Hotspot did not create one) ---
# WiFi phones need 10.10.10.x from hEX — NOT from the AP. AP = bridge mode, DHCP OFF on AP.
:if ([:len [/ip dhcp-server find interface=bridge-mru001]] = 0) do={
    /ip dhcp-server add name=mrui001-dhcp interface=bridge-mru001 address-pool=mrui001-pool disabled=no comment="MRU001 DHCP"
}
:if ([:len [/ip dhcp-server network find address="10.10.10.0/24"]] = 0) do={
    /ip dhcp-server network add address=10.10.10.0/24 gateway=10.10.10.1 dns-server=10.10.10.1 comment="MRU001 guest"
}

# --- 5. Hotspot profile — html-directory=hotspot + RADIUS (redirect via login.html) ---
:if ([:len [/ip hotspot profile find name=mrui001-profile]] = 0) do={
    /ip hotspot profile add name=mrui001-profile
}
/ip hotspot profile set mrui001-profile hotspot-address=10.10.10.1 dns-name=wifi.mru001.local html-directory=hotspot login-by=http-chap,http-pap,cookie http-cookie-lifetime=1d use-radius=yes radius-accounting=yes radius-interim-update=5m nas-port-type=ethernet

# --- 6. Hotspot server on guest bridge ---
:if ([:len [/ip hotspot find name=mrui001-hotspot]] = 0) do={
    /ip hotspot add name=mrui001-hotspot interface=bridge-mru001 address-pool=mrui001-pool profile=mrui001-profile
} else={
    /ip hotspot set mrui001-hotspot interface=bridge-mru001 address-pool=mrui001-pool profile=mrui001-profile disabled=no
}

# --- 7. RADIUS client (Volo FreeRADIUS) ---
:if ([:len [/radius find comment="MRUI001"]] = 0) do={
    /radius add service=hotspot address=68.183.181.73 secret=qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY authentication-port=1812 accounting-port=1813 timeout=3s comment=MRUI001
} else={
    /radius set [find comment="MRUI001"] address=68.183.181.73 secret=qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY authentication-port=1812 accounting-port=1813 service=hotspot timeout=3s
}

# --- 8. CoA / Disconnect (port 3799) ---
/radius incoming set accept=yes port=3799

# --- 9. Walled garden — portal + API before login ---
/ip hotspot walled-garden ip remove [find comment~"MRU001"]
/ip hotspot walled-garden ip add action=accept dst-host=portal.volowifi.com comment="MRU001 portal"
/ip hotspot walled-garden ip add action=accept dst-host=www.volowifi.com comment="MRU001 volowifi root"
/ip hotspot walled-garden ip add action=accept dst-host=portal-api.volowifi.com comment="MRU001 API"
/ip hotspot walled-garden ip add action=accept protocol=udp dst-port=53 comment="MRU001 DNS UDP"
/ip hotspot walled-garden ip add action=accept protocol=tcp dst-port=53 comment="MRU001 DNS TCP"

# --- 10. NAT masquerade — guest subnet out via WAN (ether1) ---
/ip firewall nat remove [find comment="MRU001 masquerade"]
/ip firewall nat add chain=srcnat out-interface=ether1 src-address=10.10.10.0/24 action=masquerade comment="MRU001 masquerade"

# --- 11. Allow guest → Hotspot HTTP on router (required for portal redirect) ---
/ip firewall filter remove [find comment~"MRU001 hotspot HTTP"]
/ip firewall filter add chain=input in-interface=bridge-mru001 protocol=tcp dst-port=80 action=accept comment="MRU001 hotspot HTTP"
/ip firewall filter add chain=input in-interface=bridge-mru001 protocol=tcp dst-port=443 action=accept comment="MRU001 hotspot HTTPS"
/ip firewall filter add chain=input in-interface=bridge-mru001 protocol=udp dst-port=53 action=accept comment="MRU001 DNS input UDP"
/ip firewall filter add chain=input in-interface=bridge-mru001 protocol=tcp dst-port=53 action=accept comment="MRU001 DNS input TCP"
/ip firewall filter add chain=input in-interface=bridge-mru001 protocol=udp dst-port=67 action=accept comment="MRU001 DHCP input"

# --- 12. Block other guest → router management (HTTP/HTTPS allowed above) ---
/ip firewall filter remove [find comment="MRU001 block guest to router"]
/ip firewall filter add chain=input in-interface=bridge-mru001 src-address=10.10.10.0/24 action=drop comment="MRU001 block guest to router"

# DO NOT add forward accept bridge→WAN here — it bypasses Hotspot and gives free internet!
# Hotspot auto-creates forward rules (jump to hotspot chain) to block unauth users.
# Remove old bypass rules if they exist:
/ip firewall filter remove [find comment="MRU001 guest forward WAN"]
/ip firewall filter remove [find comment="MRU001 guest drop other forward"]

:put "MRU001 hEX script done. Upload hotspot/login.html then test. Forget WiFi on phone before retest."
