export type RouteAccessEntry = {
  visibility?: boolean;
  access?: boolean;
};

export type RouteAccessMap = Record<string, RouteAccessEntry> | null | undefined;

const ALWAYS_ALLOWED_EXACT = new Set(["/", "/home", "/profile", "/timeline", "/unauthorized"]);
const ALWAYS_ALLOWED_PREFIXES = ["/home/", "/profile/", "/timeline/", "/unauthorized/"];

function isResourceSegment(segment: string): boolean {
  if (!segment) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  if (/^\d+$/.test(segment)) return true;
  if (/^[a-z0-9]{20,}$/i.test(segment)) return true;
  return false;
}

function normalizePath(path: string): string {
  const base = path.split("?")[0].split("#")[0] || "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

function isAlwaysAllowed(path: string): boolean {
  if (ALWAYS_ALLOWED_EXACT.has(path)) return true;
  return ALWAYS_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isGrantedChild(path: string, grantedRoute: string): boolean {
  if (path === grantedRoute) return true;
  if (!path.startsWith(`${grantedRoute}/`)) return false;
  const rest = path.slice(grantedRoute.length + 1).split("/").filter(Boolean);
  return rest.length > 0 && rest.every(isResourceSegment);
}

/**
 * Menu-key access check.
 * A granted page allows only itself and ID-like child segments (detail routes).
 * It does not grant sibling modules — `/wifi` does not open `/wifi/catalog/...`.
 */
export function isRouteAccessible(path: string, userRoles: RouteAccessMap): boolean {
  const pathname = normalizePath(path);
  if (isAlwaysAllowed(pathname)) return true;
  if (!userRoles) return false;

  const aliases =
    pathname === "/"
      ? ["/", "/dashboard"]
      : pathname === "/dashboard"
        ? ["/dashboard", "/"]
        : [pathname];

  for (const alias of aliases) {
    if (userRoles[alias]?.access) return true;
  }

  const knownPaths = Object.keys(userRoles).filter((key) => key.startsWith("/"));
  const longestKnown = knownPaths
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (longestKnown) {
    if (userRoles[longestKnown]?.access) return true;
    return false;
  }

  return knownPaths.some(
    (route) => Boolean(userRoles[route]?.access) && isGrantedChild(pathname, route)
  );
}
