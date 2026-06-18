import { NextRequest, NextResponse } from "next/server";
import {
  buildCaptiveProxyForwardHeaders,
  copyCaptiveProxyResponseHeaders,
  resolveCaptiveApiBaseUrl,
} from "@/lib/captive-portal/proxy";

async function proxyCaptiveApi(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const incoming = new URL(request.url);
  const target = `${resolveCaptiveApiBaseUrl()}/${path.join("/")}${incoming.search}`;

  const headers = buildCaptiveProxyForwardHeaders(request);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyCaptiveProxyResponseHeaders(upstream),
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyCaptiveApi(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyCaptiveApi(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyCaptiveApi(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyCaptiveApi(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyCaptiveApi(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyCaptiveApi(request, context);
}
