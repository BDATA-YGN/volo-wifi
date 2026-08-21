# =============================================================================
# MPRHQ-invalid-fix.rsc — run on the LIVE router if mprhq-hotspot shows INVALID
# Import: /import file-name=MPRHQ-invalid-fix.rsc
#
# Fixes the two usual causes:
#   1. RouterOS 7 device-mode hotspot=no
#      MUST confirm with POWER UNPLUG or Mode/Reset BUTTON (not /system reboot)
#   2. hotspot-address 172.1.1.0 is the NETWORK address, not a usable host IP
# =============================================================================

# Move guest gateway from .0 (network) → .1 (usable host)
:foreach a in=[/ip address find interface=bridge-mprhq] do={
    /ip address remove $a
}
/ip address add address=172.1.1.1/24 interface=bridge-mprhq network=172.1.1.0

:if ([:len [/ip pool find name=dhcp]] > 0) do={
    /ip pool set [find name=dhcp] ranges=172.1.1.2-172.1.1.254
} else={
    /ip pool add name=dhcp ranges=172.1.1.2-172.1.1.254
}

:foreach n in=[/ip dhcp-server network find address=172.1.1.0/24] do={
    /ip dhcp-server network remove $n
}
/ip dhcp-server network add address=172.1.1.0/24 dns-server=172.1.1.1 \
    gateway=172.1.1.1 netmask=24

/ip hotspot profile set [find name=mprhq-profile] hotspot-address=172.1.1.1

/ip hotspot disable [find]
/ip hotspot set [find] name=MPRHQ
/ip hotspot profile set [find name=mprhq-profile] html-directory-override=flash/hotspot
/ip hotspot enable [find]

# Last: this command waits for a PHYSICAL confirm (blocks Terminal).
# Unplug power or short-press Mode. Do NOT /system reboot.
/system device-mode update hotspot=yes

:put "MPRHQ-invalid-fix applied. Unplug power now if countdown is showing."
