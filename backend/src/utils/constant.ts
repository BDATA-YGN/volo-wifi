export const USER_TYPE = Object.freeze({
  ADMIN: 1,
  VIP: 2,
  DEVELOPER: 3,
});

export const ERROR_CODE = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  COMFLIT: 'COMFLIT',
});

export const ERROR = Object.freeze({
  CODE: {
    404: {
      MOVIE_NOT_FOUND: 'MOVIE_NOT_FOUND',
    },
    403: {
      ACCESS_DENIED: 'ACCESS_DENIED',
    },
    409: {
      MOVIE_CONFLICT: 'MOVIE_CONFLICT',
    },
    500: {
      INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    },
    400: {
      INVALID_REQUEST: 'INVALID_REQUEST',
    },
    401: {
      UNAUTHORIZED: 'UNAUTHORIZED',
    },
  },
  MESSAGE: {
    NOT_FOUND: (msg?: string) => (msg ? `${msg} is not found` : `Not Found`),
    REQUIRED: (msg?: string) => (msg ? `${msg} is required` : `payload required`),
    CONFLICT: (msg?: string) => (msg ? `${msg} already exists` : `Conflict occurred`),
    ACCESS_DENIED: (msg?: string) => (msg ? `${msg} access denied` : `Access denied`),
    SERVER_ERROR: (msg?: string) => (msg ? `${msg} encountered an error` : `Internal Server Error`),
    INVALID_REQUEST: (msg?: string) => (msg ? `${msg} is invalid` : `Invalid Request`),
    UNAUTHORIZED: (msg?: string) => (msg ? `${msg} requires authentication` : `Unauthorized`),
  },
});
