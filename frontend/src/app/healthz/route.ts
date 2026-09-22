import { NextResponse } from "next/server";

/** Container liveness — must not proxy to the backend. */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
