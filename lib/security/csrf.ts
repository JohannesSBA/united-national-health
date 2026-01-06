import { NextRequest, NextResponse } from "next/server";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

export const CSRF_COOKIE_NAME = CSRF_COOKIE;
export const CSRF_HEADER_NAME = CSRF_HEADER;

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export function validateOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function validateCsrf(request: NextRequest) {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  return !!headerToken && !!cookieToken && headerToken === cookieToken;
}

export function assertCsrf(request: NextRequest) {
  if (!validateOrigin(request) || !validateCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }
  return null;
}
