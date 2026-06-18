/system device-mode update hotspot=yes

/interface bridge
add name=bridge-volo-hotspot comment="Volo guest LAN"

/interface bridge port
add bridge=bridge-volo-hotspot interface=ether2 comment="Volo AP"
add bridge=bridge-volo-hotspot interface=ether3 comment="Volo LAN"

/ip address
add address=172.16.0.1/24 interface=bridge-volo-hotspot network=172.16.0.0

/ip pool
add name=volo-hotspot-pool ranges=172.16.0.10-172.16.0.254

/ip dhcp-server network
add address=172.16.0.0/24 dns-server=172.16.0.1 gateway=172.16.0.1

/ip dhcp-client
add add-default-route=yes disabled=no interface=ether1 use-peer-dns=yes \
    comment="Volo WAN DHCP"

/ip dns
set allow-remote-requests=yes

/ip hotspot profile
add hotspot-address=172.16.0.1 html-directory=flash/hotspot \
    http-cookie-lifetime=1d login-by=cookie,http-chap,http-pap name=\
    volo-hotspot-profile nas-port-type=ethernet radius-accounting=yes \
    radius-interim-update=5m use-radius=yes

/ip hotspot
add address-pool=volo-hotspot-pool disabled=no interface=bridge-volo-hotspot \
    name=volo-hotspot profile=volo-hotspot-profile

/radius
add address=68.183.181.73 authentication-port=1812 accounting-port=1813 \
    comment=volo-hotspot secret=qtLbLRCHG2Jj1vAOqgb1G0mhYE0z19zY service=hotspot \
    timeout=3s

/radius incoming
set accept=yes port=3799

/ip hotspot walled-garden ip
add action=accept comment=volo-hotspot-portal dst-host=portal.volowifi.com
add action=accept comment=volo-hotspot-api dst-host=portal-api.volowifi.com
add action=accept comment=volo-hotspot-dns-udp dst-port=53 protocol=udp
add action=accept comment=volo-hotspot-dns-tcp dst-port=53 protocol=tcp

/ip firewall nat
add action=masquerade chain=srcnat comment=volo-hotspot-nat out-interface=ether1 \
    src-address=172.16.0.0/24

/ip firewall filter
add action=accept chain=input comment=volo-hotspot-http dst-port=80 \
    in-interface=bridge-volo-hotspot protocol=tcp
add action=accept chain=input comment=volo-hotspot-https dst-port=443 \
    in-interface=bridge-volo-hotspot protocol=tcp
add action=accept chain=input comment=volo-hotspot-dns-udp dst-port=53 \
    in-interface=bridge-volo-hotspot protocol=udp
add action=accept chain=input comment=volo-hotspot-dns-tcp dst-port=53 \
    in-interface=bridge-volo-hotspot protocol=tcp
add action=accept chain=input comment=volo-hotspot-dhcp dst-port=67 \
    in-interface=bridge-volo-hotspot protocol=udp
add action=drop chain=input comment=volo-hotspot-drop-guest \
    in-interface=bridge-volo-hotspot src-address=172.16.0.0/24
