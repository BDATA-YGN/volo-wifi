import { NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/api-origins";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4_000;

function notReady(detail: string) {
  return NextResponse.json(
    {
      status: "degraded",
      ready: false,
      initial: [
        {
          key: "api",
          label: "API connection",
          ready: false,
          detail,
        },
      ],
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/** Login readiness probe — proxies to the backend without going through Cloudflare. */
export async function GET() {
  const base = getServerApiBaseUrl();
  if (!base) {
    return notReady("API_URL / INTERNAL_API_URL is not set on the frontend container.");
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base) && process.env.NODE_ENV === "production") {
    return notReady(
      `Frontend API_URL is ${base}. Inside Docker that is the frontend container itself. Set INTERNAL_API_URL to the backend service, e.g. http://<backend-app>:6558/console.`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const body = await upstream.json().catch(() => null);
    if (!body || !Array.isArray(body.initial)) {
      return notReady(`API health returned ${upstream.status} from ${base}/health`);
    }

    return NextResponse.json(body, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "AbortError" || err.message.includes("timeout"));
    const detail = timedOut
      ? `Cannot reach ${base} from this container (Cloudflare hairpin / wrong INTERNAL_API_URL). Use the backend Docker service, e.g. http://<backend-app>:6558/console.`
      : err instanceof Error
        ? err.message
        : "Cannot reach the API";
    return notReady(detail);
  } finally {
    clearTimeout(timer);
  }
}
