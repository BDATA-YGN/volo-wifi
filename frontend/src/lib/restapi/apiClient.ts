// lib/restapi/apiClient.ts
import axios, { AxiosError, AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import {
  AUTH_APP_HEADER,
  authAppFromPathname,
  type AuthApp,
  loginPathForAuthApp,
  SMS_MOBILE_ACTOR_HEADER,
} from '@/lib/auth/cookies';

interface ApiClientConfig extends AxiosRequestConfig {
  interceptors?: {
    request?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    response?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  };
  disableCookieSync?: boolean;
  /** Do not forward existing session cookies (e.g. login bootstrap). */
  skipAuthCookies?: boolean;
  /**
   * Which session cookies to forward on the server.
   * When `admin`, server actions invoked from `/partner` auto-upgrade to `partner`
   * so wifi + partner sessions can coexist.
   */
  authApp?: AuthApp;
  /** When true, never auto-resolve auth app from the Next request path. */
  lockAuthApp?: boolean;
}

async function resolveEffectiveAuthApp(
  configured: AuthApp,
  lockAuthApp: boolean | undefined,
): Promise<AuthApp> {
  if (lockAuthApp || configured !== 'admin') return configured;
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const explicit = h.get(AUTH_APP_HEADER);
    if (explicit === 'partner' || explicit === 'admin' || explicit === 'captive') {
      return explicit;
    }
    const referer = h.get('referer') ?? '';
    let pathname = '';
    try {
      pathname = referer ? new URL(referer).pathname : '';
    } catch {
      pathname = '';
    }
    const nextUrl = h.get('next-url') ?? h.get('x-url') ?? h.get('x-pathname') ?? '';
    const path = pathname || nextUrl;
    if (path) return authAppFromPathname(path);
  } catch {
    // Outside a request context (build) — keep configured app.
  }
  return configured;
}

const createApiClient = (baseURL?: string, customConfig: ApiClientConfig = {}) => {
  const isBrowser = typeof window !== 'undefined';
  const configuredAuthApp = customConfig.authApp ?? 'admin';

  const instance = axios.create({
    baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL,
    withCredentials: isBrowser,
    timeout: customConfig.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...customConfig.headers,
    },
    ...customConfig,
  });

  instance.interceptors.request.use(
    async (config) => {
      const authApp = isBrowser
        ? configuredAuthApp === 'admin' && !customConfig.lockAuthApp
          ? authAppFromPathname(window.location.pathname)
          : configuredAuthApp
        : await resolveEffectiveAuthApp(configuredAuthApp, customConfig.lockAuthApp);

      config.headers[AUTH_APP_HEADER] = authApp;

      if (!isBrowser && !customConfig.skipAuthCookies) {
        try {
          const { getServerCookiesForAuthApp, getForwardedClientHeaders } = await import('./server-actions');

          const [cookieString, fwdHeaders] = await Promise.all([
            getServerCookiesForAuthApp(authApp),
            getForwardedClientHeaders(),
          ]);

          // Allow callers to pass an explicit Cookie (e.g. same-action login handoff).
          const existingCookie = config.headers.Cookie ?? config.headers.cookie;
          if (!existingCookie && cookieString) {
            config.headers.Cookie = cookieString;
          }
          for (const [k, v] of Object.entries(fwdHeaders)) {
            if (v) config.headers[k] = v;
          }

          if (authApp === 'collector' || authApp === 'customer') {
            config.headers[SMS_MOBILE_ACTOR_HEADER] = authApp;
          }
        } catch {
          console.debug('Axios: Could not access server-side cookies/headers.');
        }
      } else if (!isBrowser && customConfig.skipAuthCookies) {
        try {
          const { getForwardedClientHeaders } = await import('./server-actions');
          const fwdHeaders = await getForwardedClientHeaders();
          for (const [k, v] of Object.entries(fwdHeaders)) {
            if (v) config.headers[k] = v;
          }
        } catch {
          console.debug('Axios: Could not access forwarded client headers.');
        }
      }

      (config as InternalAxiosRequestConfig & { __authApp?: AuthApp }).__authApp = authApp;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🔷 [${isBrowser ? 'Client' : 'Server'}:${authApp}] Request:`,
          config.method?.toUpperCase(),
          config.url,
        );
      }

      if (customConfig.interceptors?.request) {
        return await customConfig.interceptors.request(config);
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    async (response: AxiosResponse) => {
      let syncedCookieHeader = '';
      if (!isBrowser && !customConfig.disableCookieSync) {
        try {
          const authApp =
            (response.config as InternalAxiosRequestConfig & { __authApp?: AuthApp }).__authApp ??
            configuredAuthApp;
          const { syncServerCookies } = await import('./server-actions');
          syncedCookieHeader = await syncServerCookies(response, authApp);
        } catch {
          // Silent fail for public endpoints
        }
      }

      if (customConfig.interceptors?.response) {
        const shaped = await customConfig.interceptors.response(response);
        if (shaped && typeof shaped === 'object') {
          (shaped as { __syncedCookieHeader?: string }).__syncedCookieHeader = syncedCookieHeader;
        }
        return shaped;
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401 && isBrowser) {
        window.location.href = loginPathForAuthApp(window.location.pathname);
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

const sharedResponseInterceptor = {
  response: async (response: AxiosResponse): Promise<any> => ({
    status: response.status,
    data: response.data,
  }),
};

const apiClient = createApiClient(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL, {
  authApp: 'admin',
  interceptors: sharedResponseInterceptor,
});

export const partnerApiClient = createApiClient(process.env.API_URL, {
  authApp: 'partner',
  lockAuthApp: true,
  interceptors: sharedResponseInterceptor,
});

export const collectorApiClient = createApiClient(process.env.API_URL, {
  authApp: 'collector',
  lockAuthApp: true,
  interceptors: sharedResponseInterceptor,
});

export const customerApiClient = createApiClient(process.env.API_URL, {
  authApp: 'customer',
  lockAuthApp: true,
  interceptors: sharedResponseInterceptor,
});

/** Login / bootstrap calls: persist Set-Cookie from API without sending an existing session. */
export const sessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "admin",
  lockAuthApp: true,
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const partnerSessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "partner",
  lockAuthApp: true,
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const collectorSessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "collector",
  lockAuthApp: true,
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const customerSessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "customer",
  lockAuthApp: true,
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const publicApiClient = createApiClient(process.env.API_URL, {
  disableCookieSync: true,
  lockAuthApp: true,
  interceptors: {
    request: async (config) => {
      delete config.headers.Cookie;
      return config;
    },
    response: sharedResponseInterceptor.response,
  },
});

export { apiClient, createApiClient };
