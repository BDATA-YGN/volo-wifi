export const AUTH_API_ROUTES = {
    login: (username: string, password: string) => `/auth/login`,
    logout: "/auth/logout",
    userDetails: "/auth/me",
    refreshToken: "/auth/token/refresh",
  };
  