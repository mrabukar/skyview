import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * DEMO MODE — no server-side session cookie exists, so the route guard
 * lets everything through. The client-side AuthProvider still redirects
 * to /login when the demo session is missing.
 */
export function handleAuthProxy(_request: NextRequest): NextResponse {
  return NextResponse.next();
}
