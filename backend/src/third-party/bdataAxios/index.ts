import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import * as envConfig from "@config";

type PrivateNetworkPolicy = 'block' | 'allow';

interface ApiClientConfig extends AxiosRequestConfig {
  interceptors?: {
    request?: (config: AxiosRequestConfig) => AxiosRequestConfig;
    response?: (response: AxiosResponse) => AxiosResponse;
  };
}

function normalizeHostname(hostname: string) {
  // Lowercase and remove a trailing dot (e.g. "localhost.")
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function isIpv4(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isPrivateIpv4(host: string) {
  const parts = host.split('.').map(n => Number(n));
  if (parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;

  // Loopback 127.0.0.0/8
  if (a === 127) return true;
  // RFC1918 private ranges
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // Link-local
  if (a === 169 && b === 254) return true;

  return false;
}

function isPrivateHost(hostname: string) {
  const host = normalizeHostname(hostname);

  if (host === 'localhost') return true;
  if (host === '::1' || host === '[::1]') return true;
  if (host.endsWith('.localhost')) return true;

  if (isIpv4(host) && isPrivateIpv4(host)) return true;

  // Very common docker / k8s internal names; treat as private by default.
  if (host === 'host.docker.internal') return true;
  if (host.endsWith('.local')) return true;

  return false;
}

function resolveRequestUrl(config: AxiosRequestConfig): URL | null {
  try {
    const url = config.url || '';
    const base = config.baseURL || '';

    // If `url` is absolute, URL() ignores base.
    // If `url` is relative, baseURL must be absolute or URL() throws.
    return new URL(url, base || undefined);
  } catch {
    return null;
  }
}

const createApiClient = (baseURL: string, customConfig: ApiClientConfig = {}) => {
  // Security defaults:
  // - disable proxy usage unless caller explicitly enables it (mitigates NO_PROXY related SSRF bypass classes)
  // - enforce bounded redirects and body sizes to reduce DoS risk
  const proxyEnabled = process.env.AXIOS_PROXY_ENABLED === 'true';
  const privateNetPolicy: PrivateNetworkPolicy =
    process.env.AXIOS_ALLOW_PRIVATE_NETWORK === 'true' ? 'allow' : 'block';

  const maxBodyLength = customConfig.maxBodyLength ?? 10 * 1024 * 1024; // 10MB
  const maxContentLength = customConfig.maxContentLength ?? 10 * 1024 * 1024; // 10MB
  const maxRedirects = customConfig.maxRedirects ?? 5;

  const instance = axios.create({
    baseURL,
    timeout: customConfig.timeout || 10000,
    maxBodyLength,
    maxContentLength,
    maxRedirects,
    proxy: proxyEnabled ? (customConfig as any).proxy : false,
    ...customConfig,
  });

  // Add request interceptor to dynamically set headers
  instance.interceptors.request.use(
    (config: any) => {
      // Apply default headers
      config.headers = config.headers || {};
      config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      // NOTE: Do not set `Access-Control-Allow-*` headers on outbound requests.
      // Those are *response* headers configured on servers, and can cause confusing behavior.

      // Apply custom request interceptor if provided
      if (customConfig.interceptors?.request) {
        return customConfig.interceptors.request(config);
      }

      // SSRF hardening (server-side): block common private/loopback targets by default.
      // If you need to call internal services, set AXIOS_ALLOW_PRIVATE_NETWORK=true for that environment.
      const u = resolveRequestUrl(config);
      if (u) {
        const proto = u.protocol.toLowerCase();
        if (proto !== 'http:' && proto !== 'https:') {
          throw new Error(`Blocked non-http(s) protocol: ${proto}`);
        }

        const host = normalizeHostname(u.hostname);
        if (privateNetPolicy === 'block' && isPrivateHost(host)) {
          throw new Error(`Blocked private network request to host: ${host}`);
        }
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for logging and error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      if (envConfig.NODE_ENV === "development") {
        // console.log("Response:", JSON.stringify(response.data));
      }

      // Apply custom response interceptor if provided
      if (customConfig.interceptors?.response) {
        return customConfig.interceptors.response(response);
      }

      return response;
    },
    (error: AxiosError) => {
      return handleGlobalError(error);
    }
  );

  return instance;
};

// Error handling utilities
interface ErrorResponse {
  message?: string;
  [key: string]: any;
}

function isErrorResponse(data: any): data is ErrorResponse {
  return typeof data === 'object' && data !== null && 'message' in data;
}

class RestApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, RestApiError.prototype);
  }
}

function handleGlobalError(error: AxiosError) {
  if (error.response) {
    const { status, data } = error.response;

    if (isErrorResponse(data)) {
      let errorMessage = data.message || 'An error occurred';

      switch (status) {
        case 400:
          errorMessage = 'Bad Request: ' + errorMessage;
          break;
        case 401:
          errorMessage = 'Unauthorized: Please log in.';
          break;
        case 403:
          errorMessage = 'Forbidden: ' + errorMessage;
          break;
        case 404:
          errorMessage = 'Not Found: ' + errorMessage;
          break;
        case 500:
          errorMessage = 'Internal Server Error: ' + errorMessage;
          break;
        default:
          errorMessage = 'Unhandled Error: ' + errorMessage;
      }

      throw new RestApiError(status, errorMessage, data);
    } else {
      throw new RestApiError(status, 'Unknown error structure', data);
    }
  } else if (error.request) {
    throw new RestApiError(0, 'No response from server', error.request);
  } else {
    throw new RestApiError(0, 'Error setting up request', error.message);
  }
}

// const defaultApiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL || '');

// const tmdbApiClient = createApiClient(envConfig.API_BASE_URL, {
//   interceptors: {
//     request: (config) => {
//       const apiKey = envConfig.API_KEY;

//       if (!apiKey) {
//         throw new Error('TMDB API Key is not defined in environment variables.');
//       }

//       config.params = {
//         ...(config.params || {}),
//         language: envConfig.API_LANG,
//       };

//       config.headers = {
//         ...config.headers,
//         Authorization: `Bearer ${apiKey}`,
//         Accept: 'application/json',
//       };

//       // console.log('TMDB Request Interceptor:', config);
//       return config;
//     },
//     response: (response): any => {
//       // console.log('TMDB Response Interceptor:', response);
//       return {
//         status: response.status,
//         data: response.data,
//       };
//     },
//   },
// });

export { createApiClient, RestApiError };
