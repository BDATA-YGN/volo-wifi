import type { APIErrorResponse } from "@/common/exceptions/handleApiError";

export type LoginLockDetails = {
  maxAttempts?: number;
  failedAttempts?: number;
  remainingAttempts?: number;
  lockedUntil?: string;
  secondsRemaining?: number;
};

export type LoginFeedback = {
  kind: "credentials" | "locked" | "blocked" | "not_found";
  message: string;
  remainingAttempts?: number;
  maxAttempts?: number;
  lockedUntilMs?: number;
};

export function isApiErrorResponse(err: unknown): err is APIErrorResponse {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as APIErrorResponse).message === "string" &&
    "code" in err &&
    typeof (err as APIErrorResponse).code === "number"
  );
}

export function parseLoginLockDetails(details: unknown): LoginLockDetails | undefined {
  if (!details || typeof details !== "object") return undefined;
  const d = details as Record<string, unknown>;
  return {
    maxAttempts: typeof d.maxAttempts === "number" ? d.maxAttempts : undefined,
    failedAttempts: typeof d.failedAttempts === "number" ? d.failedAttempts : undefined,
    remainingAttempts:
      typeof d.remainingAttempts === "number" ? d.remainingAttempts : undefined,
    lockedUntil: typeof d.lockedUntil === "string" ? d.lockedUntil : undefined,
    secondsRemaining:
      typeof d.secondsRemaining === "number" ? d.secondsRemaining : undefined,
  };
}

/** Resolve API error body from server action / axios (handleApiError shape or raw axios). */
export function normalizeLoginApiError(err: unknown): {
  status: number;
  errorCode?: string;
  message: string;
  details?: LoginLockDetails;
} {
  // Next.js may wrap server-action failures in Error and drop custom fields.
  if (err instanceof Error && !isApiErrorResponse(err)) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause) {
      return normalizeLoginApiError(cause);
    }
    const msg = err.message;
    if (/too many failed sign-in/i.test(msg)) {
      const minMatch = msg.match(/(\d+)\s*minute/i);
      const minutes = minMatch ? Number(minMatch[1]) : 1;
      return {
        status: 429,
        errorCode: "ACCOUNT_LOCKED",
        message: msg,
        details: {
          secondsRemaining: minutes * 60,
          lockedUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
        },
      };
    }
  }

  if (isApiErrorResponse(err)) {
    const details = parseLoginLockDetails(err.details);
    const errorCode =
      typeof (err as APIErrorResponse & { errorCode?: string }).errorCode === "string"
        ? (err as APIErrorResponse & { errorCode?: string }).errorCode
        : undefined;
    return { status: err.code, message: err.message, details, errorCode };
  }

  const ax = err as { response?: { status?: number; data?: { error?: { code?: string; message?: string; details?: unknown } } } };
  const status = ax?.response?.status ?? 500;
  const apiErr = ax?.response?.data?.error;
  return {
    status,
    errorCode: apiErr?.code,
    message: apiErr?.message ?? "Request failed",
    details: parseLoginLockDetails(apiErr?.details),
  };
}

export function formatLockCountdown(lockedUntilMs: number, now = Date.now()): string {
  const totalSec = Math.max(0, Math.ceil((lockedUntilMs - now) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export function buildLoginFeedback(
  err: unknown,
  t: TranslateFn,
): LoginFeedback {
  const api = normalizeLoginApiError(err);

  if (api.status === 404 || api.errorCode === "RESOURCE_NOT_FOUND") {
    return { kind: "not_found", message: t("error_invalid_account") };
  }

  if (api.status === 403 || api.errorCode === "ACCOUNT_BLOCKED") {
    return { kind: "blocked", message: t("error_account_blocked") };
  }

  const lockedUntilMs = resolveLockedUntilMs(api.details);
  if (
    api.status === 429 ||
    api.errorCode === "ACCOUNT_LOCKED" ||
    (lockedUntilMs !== undefined && lockedUntilMs > Date.now())
  ) {
    const countdown = lockedUntilMs
      ? formatLockCountdown(lockedUntilMs)
      : "0:00";
    const lockedUntilMsResolved =
      lockedUntilMs ??
      (typeof api.details?.secondsRemaining === "number"
        ? Date.now() + api.details.secondsRemaining * 1000
        : undefined);
    return {
      kind: "locked",
      message: t("error_account_locked_countdown", { countdown }),
      maxAttempts: api.details?.maxAttempts,
      lockedUntilMs: lockedUntilMsResolved,
    };
  }

  const remaining = api.details?.remainingAttempts;
  const max = api.details?.maxAttempts;
  if (typeof remaining === "number" && typeof max === "number") {
    return {
      kind: "credentials",
      message: t("error_attempts_remaining", { remaining, max }),
      remainingAttempts: remaining,
      maxAttempts: max,
    };
  }

  return { kind: "credentials", message: t("error_invalid_credentials") };
}

export function resolveLockedUntilMs(details?: LoginLockDetails): number | undefined {
  if (details?.lockedUntil) {
    const ms = Date.parse(details.lockedUntil);
    if (Number.isFinite(ms)) return ms;
  }
  if (typeof details?.secondsRemaining === "number" && details.secondsRemaining > 0) {
    return Date.now() + details.secondsRemaining * 1000;
  }
  return undefined;
}
