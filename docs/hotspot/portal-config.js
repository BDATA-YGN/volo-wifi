/**
 * Portal URLs — edit before uploading hotspot/ to the router.
 *
 * Auth query (MikroTik substitutes $(…)):
 *   mac, ip, nas_ip=$(server-address), NASID=$(identity),
 *   hostname, server-name, link-login, link-login-only, link-logout, link-orig
 *
 * Site lock uses NASID=$(identity) only (same as /system identity).
 * NAS IP is not used to find the site. MikroTik has no NAS MAC variable.
 */
window.VOLO_PORTAL_AUTH = 'https://portal-v2.volowifi.com/portal/auth';
window.VOLO_PORTAL_AFTER_LOGIN = 'https://portal-v2.volowifi.com/portal';

window.VOLO_PORTAL_BASE = window.VOLO_PORTAL_AUTH;

window.voloPortalAuthUrl = function (queryString) {
  var auth = (window.VOLO_PORTAL_AUTH || window.VOLO_PORTAL_BASE || '').replace(/\/$/, '');
  return queryString ? auth + (auth.indexOf('?') >= 0 ? '&' : '?') + queryString : auth;
};

window.voloPortalDashboardUrl = function () {
  return window.VOLO_PORTAL_AFTER_LOGIN || 'https://portal-v2.volowifi.com/portal';
};
