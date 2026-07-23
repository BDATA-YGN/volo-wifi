/**
 * Single-source frontend env.
 *
 * Set the canonical (non-NEXT_PUBLIC) keys once; this mirrors them into
 * NEXT_PUBLIC_* so browser code keeps working without duplicate .env entries.
 *
 * Legacy NEXT_PUBLIC_* / SOCKET_* aliases still win when already set.
 *
 * Call after `@next/env` loadEnvConfig() — typically from next.config.mjs.
 */

function first(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function setIfEmpty(key, value) {
  if (!value) return;
  if (!process.env[key]?.trim()) {
    process.env[key] = value;
  }
}

function setBoth(canonicalKey, publicKey, value) {
  if (!value) return;
  process.env[canonicalKey] = value;
  setIfEmpty(publicKey, value);
}

/**
 * @returns {{ apiUrl: string, captiveApiUrl: string, socketUrl: string, fileServerUrl: string, hostName: string }}
 */
export function applyPublicEnvDefaults() {
  const apiUrl = first("API_URL", "NEXT_PUBLIC_API_URL");
  if (apiUrl) {
    setBoth("API_URL", "NEXT_PUBLIC_API_URL", apiUrl);
    setIfEmpty("NEXT_PUBLIC_UPLOAD_URL", apiUrl);
  }

  const captiveApiUrl =
    first("CAPTIVE_API_URL") ||
    (apiUrl ? apiUrl.replace(/\/console\/?$/, "/api") : "") ||
    "http://localhost:4457/api";
  process.env.CAPTIVE_API_URL = captiveApiUrl;
  // Browser always goes through Next proxy route `/portal-api` — never paste the raw API host twice.
  setIfEmpty("NEXT_PUBLIC_CAPTIVE_API_URL", "/portal-api");

  const socketUrl = first("SOCKET_URL", "NEXT_PUBLIC_SOCKET_URL");
  if (socketUrl) {
    setBoth("SOCKET_URL", "NEXT_PUBLIC_SOCKET_URL", socketUrl);
  }

  const socketPath = first("SOCKET_PATH", "NEXT_PUBLIC_SOCKET_PATH") || "/general/socket.io";
  setBoth("SOCKET_PATH", "NEXT_PUBLIC_SOCKET_PATH", socketPath);

  for (const [canonical, pub] of [
    ["CAPTIVE_HOST", "NEXT_PUBLIC_CAPTIVE_HOST"],
    ["PARTNER_HOST", "NEXT_PUBLIC_PARTNER_HOST"],
    ["COLLECTOR_HOST", "NEXT_PUBLIC_COLLECTOR_HOST"],
    ["CUSTOMER_HOST", "NEXT_PUBLIC_CUSTOMER_HOST"],
  ]) {
    const value = first(canonical, pub);
    if (value) setBoth(canonical, pub, value);
  }

  const bypass = first("BY_PASS", "NEXT_PUBLIC_BY_PASS") || "false";
  setBoth("BY_PASS", "NEXT_PUBLIC_BY_PASS", bypass);

  const cachePrefix =
    first("CACHE_PREFIX", "NEXT_PUBLIC_CACHE_PREFIX", "NEXT_PUBLIC_APP_SHORT_CODE") || "volo-wifi";
  setIfEmpty("NEXT_PUBLIC_CACHE_PREFIX", cachePrefix);

  setIfEmpty("HOST_NAME", "localhost");

  return {
    apiUrl: process.env.API_URL || "",
    captiveApiUrl: process.env.CAPTIVE_API_URL || "",
    socketUrl: process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || "",
    fileServerUrl: process.env.FILE_SERVER_URL || "",
    hostName: process.env.HOST_NAME || "localhost",
  };
}
