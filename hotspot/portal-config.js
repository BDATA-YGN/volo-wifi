/**
 * Portal URLs — edit before uploading hotspot/ to the router.
 * Keep in sync with api.json and the auth redirect HTML pages.
 *
 * Auth query (MikroTik substitutes $(…)):
 *   mac, ip, nas_ip=$(server-address), NASID=$(identity),
 *   hostname, server-name, link-login, link-login-only, link-logout, link-orig
 *
 * Do not send nas_ip=$(hostname) — hostname is the DNS name, not the hotspot IP.
 * MikroTik Hotspot HTML has no NAS MAC variable — do not pass client $(mac) as nas_mac.
 *
 * After successful login (alogin / status) also opens this URL — no dashboard
 * and no cache / retry-login pages on the router.
 */
window.VOLO_PORTAL_AUTH = 'https://portal-v2.volowifi.com/portal/auth';
window.VOLO_PORTAL_AFTER_LOGIN = 'https://portal-v2.volowifi.com/portal';
