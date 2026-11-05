const CONNECT_BEFORE_QUERY =
  /ECONNREFUSED|EAI_AGAIN|ENOTFOUND|getaddrinfo|cannot connect|the database system is (starting up|shutting down)/i;

const DROPPED_CONNECTION =
  /Connection terminated|server closed the connection|ECONNRESET|EPIPE|Client has encountered a connection error|Connection closed|sorry, too many clients already/i;

const POOL_SATURATED =
  /timeout exceeded when trying to connect|Timed out fetching a new connection|too many clients already|remaining connection slots/i;

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.message} ${(error as { code?: string }).code ?? ''}`;
  return String(error);
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Query never started: opening the socket failed. Safe to retry a write. */
export function isRetryableConnectError(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'P1001' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') return true;
  return CONNECT_BEFORE_QUERY.test(errorText(error));
}

/** Read can be repeated. A write must not be, because Postgres may have committed it. */
export function isRetryableReadDisconnect(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'P1001' || code === 'P1002' || code === 'P1017' || code === '57P01' || code === '08006' || code === '08003') {
    return true;
  }
  return DROPPED_CONNECTION.test(errorText(error));
}

/** Pool or server is full. Retrying holds the request and adds another waiter. */
export function isPoolSaturatedError(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'P2024' || code === '53300') return true;
  return POOL_SATURATED.test(errorText(error));
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return isPoolSaturatedError(error) || isRetryableConnectError(error) || isRetryableReadDisconnect(error);
}
