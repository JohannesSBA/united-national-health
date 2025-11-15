import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_MATCHERS = ["/admin", "/hospital", "/clinical"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiresAuth = PROTECTED_MATCHERS.some((path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/hospital/:path*",
    "/clinical/:path*",
    "/login",
    "/logout",
    "/api/auth/:path*",
  ],
};
