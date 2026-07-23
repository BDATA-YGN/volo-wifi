// lib/restapi/apiClient.ts
import axios, { AxiosError, AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import {
  AUTH_COOKIE_NAMES,
  SMS_MOBILE_ACTOR_HEADER,
  type AuthApp,
  loginPathForAuthApp,
} from '@/lib/auth/cookies';

interface ApiClientConfig extends AxiosRequestConfig {
  interceptors?: {
    request?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    response?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  };
  disableCookieSync?: boolean;
  /** Do not forward existing session cookies (e.g. login bootstrap). */
  skipAuthCookies?: boolean;
  /** Which session cookies to forward on the server and attach actor header for mobile APIs. */
  authApp?: AuthApp;
}

const createApiClient = (baseURL?: string, customConfig: ApiClientConfig = {}) => {
  const isBrowser = typeof window !== 'undefined';
  const authApp = customConfig.authApp ?? 'admin';

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
      if (!isBrowser && !customConfig.skipAuthCookies) {
        try {
          const { getServerCookiesForAuthApp, getForwardedClientHeaders } = await import('./server-actions');

          const [cookieString, fwdHeaders] = await Promise.all([
            getServerCookiesForAuthApp(authApp),
            getForwardedClientHeaders(),
          ]);

          if (cookieString) {
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
      if (!isBrowser && !customConfig.disableCookieSync) {
        try {
          const { syncServerCookies } = await import('./server-actions');
          await syncServerCookies(response, authApp);
        } catch {
          // Silent fail for public endpoints
        }
      }

      if (customConfig.interceptors?.response) {
        return await customConfig.interceptors.response(response);
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

export const collectorApiClient = createApiClient(process.env.API_URL, {
  authApp: 'collector',
  interceptors: sharedResponseInterceptor,
});

export const customerApiClient = createApiClient(process.env.API_URL, {
  authApp: 'customer',
  interceptors: sharedResponseInterceptor,
});

/** Login / bootstrap calls: persist Set-Cookie from API without sending an existing session. */
export const sessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "admin",
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const collectorSessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "collector",
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const customerSessionBootstrapApiClient = createApiClient(process.env.API_URL, {
  authApp: "customer",
  skipAuthCookies: true,
  interceptors: sharedResponseInterceptor,
});

export const publicApiClient = createApiClient(process.env.API_URL, {
  disableCookieSync: true,
  interceptors: {
    request: async (config) => {
      delete config.headers.Cookie;
      return config;
    },
    response: sharedResponseInterceptor.response,
  },
});

export { apiClient, createApiClient };
