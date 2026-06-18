/**
 * Captive portal auth URL (no trailing slash).
 * Edit before uploading hotspot/ to the router.
 */
window.VOLO_PORTAL_BASE = 'https://portal.volowifi.com/auth';

window.voloPortalAuthUrl = function (queryString) {
  var auth = (window.VOLO_PORTAL_BASE || 'https://portal.volowifi.com/auth').replace(/\/$/, '');
  return queryString ? auth + '?' + queryString : auth;
};

window.voloPortalDashboardUrl = function () {
  var auth = (window.VOLO_PORTAL_BASE || 'https://portal.volowifi.com/auth').replace(/\/$/, '');
  var origin = auth.replace(/\/auth$/, '');
  return origin + '/dashboard';
};
