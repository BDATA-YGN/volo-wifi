# =============================================================================
# MPRHQ-ether4-office.rsc — trusted laptop on ether4 (no Hotspot portal)
# Run on the LIVE hAP after MPRHQ-hap-restore.rsc is working.
# Import: /import file-name=MPRHQ-ether4-office.rsc
#
# ether2/3 stay guest (APs). ether4 becomes office LAN 192.168.88.0/24.
# Do not re-import hap-restore after this (it removes non-bridge DHCP).
# =============================================================================

# Take ether4 off the guest Hotspot bridge
:foreach p in=[/interface bridge port find interface=ether4] do={
    /interface bridge port remove $p
}

:if ([:len [/interface list member find interface=ether4]] = 0) do={
    /interface list member add interface=ether4 list=LAN
}

:if ([:len [/ip address find interface=ether4]] = 0) do={
    /ip address add address=192.168.88.1/24 interface=ether4 network=192.168.88.0 \
        comment="MPRHQ office LAN"
}

:if ([:len [/ip pool find name=office-dhcp]] = 0) do={
    /ip pool add name=office-dhcp ranges=192.168.88.10-192.168.88.50
}

:if ([:len [/ip dhcp-server network find address=192.168.88.0/24]] = 0) do={
    /ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 \
        dns-server=192.168.88.1
}

:if ([:len [/ip dhcp-server find name=office-dhcp]] = 0) do={
    /ip dhcp-server add name=office-dhcp interface=ether4 address-pool=office-dhcp \
        disabled=no comment="MPRHQ office (no Hotspot)"
}

:if ([:len [/ip firewall nat find comment=MPRHQ-office-nat]] = 0) do={
    /ip firewall nat add action=masquerade chain=srcnat out-interface-list=WAN \
        src-address=192.168.88.0/24 comment=MPRHQ-office-nat
}

:put "ether4 is office LAN 192.168.88.1 — laptop should get 192.168.88.x and internet (no portal)"
