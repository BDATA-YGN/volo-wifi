// Normalized API failures for client UI (toast, alerts, form errors).

export interface APIErrorResponse {
  /** HTTP status code */
  code: number;
  message: string;
  /** API error code from the backend (e.g. `ACCOUNT_LOCKED`). */
  errorCode?: string;
  /** Optional server payload (e.g. login lockout metadata). */
  details?: unknown;
}

/** Error thrown from server actions / query helpers after a failed API call. */
export class ApiRequestError extends Error {
  readonly code: number;
  readonly errorCode?: string;
  readonly details?: unknown;

  constructor(payload: APIErrorResponse) {
    super(payload.message);
    this.name = "ApiRequestError";
    this.code = payload.code;
    this.errorCode = payload.errorCode;
    this.details = payload.details;
  }
}

function readNestedMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return undefined;

  const obj = value as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();

  if (obj.error && typeof obj.error === "object") {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
  }

  return undefined;
}

/** Parse Axios / server-action failures into a structured API error. */
export function parseApiError(error: unknown, fallback = "Request failed"): APIErrorResponse {
  const ax =
    error && typeof error === "object" && "response" in error
      ? (error as { response?: { status?: number; data?: unknown } }).response
      : undefined;

  const status: number =
    typeof ax?.status === "number"
      ? ax.status
      : error instanceof ApiRequestError
        ? error.code
        : error && typeof error === "object" && typeof (error as { code?: unknown }).code === "number"
          ? (error as { code: number }).code
          : 500;

  const data = ax?.data ?? (error as { data?: unknown } | undefined)?.data;

  const fromData = readNestedMessage(data);
  const fromError = readNestedMessage(error);
  const fromAxios =
    error instanceof Error && error.message && !error.message.startsWith("Request failed with status code")
      ? error.message
      : undefined;

  const message = fromData ?? fromError ?? fromAxios ?? fallback;

  const apiErr =
    data && typeof data === "object" && "error" in data
      ? (data as { error?: { code?: unknown; details?: unknown } }).error
      : undefined;

  const errorCode =
    typeof apiErr?.code === "string"
      ? apiErr.code
      : error instanceof ApiRequestError
        ? error.errorCode
        : error && typeof error === "object" && typeof (error as { errorCode?: unknown }).errorCode === "string"
          ? (error as { errorCode: string }).errorCode
          : undefined;

  const details =
    apiErr?.details ??
    (error instanceof ApiRequestError ? error.details : undefined) ??
    (data && typeof data === "object" && "details" in data
      ? (data as { details?: unknown }).details
      : undefined);

  const out: APIErrorResponse = { code: status, message };
  if (errorCode) out.errorCode = errorCode;
  if (details !== undefined) out.details = details;
  return out;
}

export function createApiRequestError(error: unknown, fallback = "Request failed"): ApiRequestError {
  try {
    return new ApiRequestError(parseApiError(error, fallback));
  } catch {
    // Circular axios / Prisma errors can blow the stack while reading nested fields.
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 500)
        : fallback;
    return new ApiRequestError({ code: 500, message });
  }
}

/**
 * Throws `ApiRequestError` so Next.js server actions preserve a readable `message` on the client.
 * Use in query.ts catch blocks: `handleApiError(error)` (no plain-object throw).
 */
export function handleApiError(error: unknown, fallback = "Request failed"): never {
  throw createApiRequestError(error, fallback);
}

/** Serializable failure for `"use server"` actions — do not throw, or production shows React #441. */
export function toActionFailure(
  error: unknown,
  fallback = "Request failed"
): {
  message: string;
  data: null;
  meta: { ok: false; status: number; errorCode?: string };
} {
  const parsed = parseApiError(error, fallback);
  return {
    message: parsed.message,
    data: null,
    meta: {
      ok: false,
      status: parsed.code,
      ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {}),
    },
  };
}

function isMinifiedReactDigest(message: string): boolean {
  return /Minified React error #441/i.test(message) || /error occurred in the Server Components render/i.test(message);
}

/** User-facing message for toast / alert — never returns raw `{ code, message }` objects. */
export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (error instanceof ApiRequestError && error.message.trim() && !isMinifiedReactDigest(error.message)) {
    return error.message.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (!msg.startsWith("Request failed with status code") && !isMinifiedReactDigest(msg)) return msg;
  }
  const parsed = parseApiError(error, fallback).message;
  if (parsed && !isMinifiedReactDigest(parsed)) return parsed;
  return fallback;
}
