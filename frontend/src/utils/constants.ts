export const COOKIES_CONSTANTS = {
    AUTHORIZATION: "Authorization",      // Legacy name, backend may use 'access_token'
    X_USER_ACCESS: "X-User-Access",      // User access permissions
    X_USER_HISTORY: "X-User-History",    // User navigation history
    X_USER_ROLE: "X-User-Role",          // User role information
    NEXT_LOCALE: "NEXT_LOCALE",          // Locale preference
    MENUS: 'menus'
}

// HTTP-only cookie names set by backend
export const HTTP_ONLY_COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_ROLE: 'user_role',
    USER_ACCESS: 'user_access'
}
