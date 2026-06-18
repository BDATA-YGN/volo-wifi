export interface InitialCheck {
  key: string;
  label: string;
  ready: boolean;
  detail?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  ready: boolean;
  version?: string;
  initial: InitialCheck[];
}

export type ReadinessState =
  | { phase: 'loading' }
  | { phase: 'ready'; health: HealthResponse }
  | { phase: 'not_ready'; health: HealthResponse }
  | { phase: 'unreachable'; error: string };

const HEALTH_PATH = '/health';
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Same-origin health probe — Next.js rewrites `/health` → backend `/health`
 * (see next.config.mjs). Avoids cross-origin CORS failures from the sign-in page.
 */
function resolveHealthUrl(): string {
  return HEALTH_PATH;
}

export async function fetchSystemHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const healthUrl = resolveHealthUrl();

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    const raw = await response.text();
    let body: HealthResponse | null = null;

    try {
      body = JSON.parse(raw) as HealthResponse;
    } catch {
      const preview = raw.trim().slice(0, 80).replace(/\s+/g, ' ');
      throw new Error(
        preview.startsWith('<')
          ? `Health endpoint returned HTML instead of JSON (${response.status})`
          : `Invalid health response (${response.status})`,
      );
    }

    if (!body || !Array.isArray(body.initial)) {
      throw new Error('Invalid health payload');
    }

    return { ...body, ready: Boolean(body.ready), status: body.status ?? 'degraded' };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function probeSystemReadiness(): Promise<ReadinessState> {
  try {
    const health = await fetchSystemHealth();
    if (health.ready) {
      return { phase: 'ready', health };
    }
    return { phase: 'not_ready', health };
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Connection timed out'
        : err instanceof Error
          ? err.message
          : 'Cannot reach the server';
    return { phase: 'unreachable', error: message };
  }
}

export function failedInitialChecks(health: HealthResponse): InitialCheck[] {
  return health.initial.filter((check) => !check.ready);
}
