import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_MATCHERS = ["/admin", "/hospital", "/clinical"];
const INTERNAL_HEADER = "x-internal-maintenance-fetch";
const MAINTENANCE_EXCLUDE_PREFIXES = [
  "/globaladmin",
  "/api/globaladmin",
  "/maintenance",
  "/api/system/maintenance",
  "/_next",
  "/favicon.ico",
];

function shouldCheckMaintenance(pathname: string) {
  return !MAINTENANCE_EXCLUDE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

async function fetchMaintenanceFlag(request: NextRequest) {
  const maintenanceUrl = new URL("/api/system/maintenance", request.url);
  const response = await fetch(maintenanceUrl, {
    headers: {
      [INTERNAL_HEADER]: "1",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.data ?? null;
}

export async function middleware(request: NextRequest) {
  const headerBypass = request.headers.get(INTERNAL_HEADER);
  if (headerBypass === "1") {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // Maintenance enforcement for public routes
  if (shouldCheckMaintenance(pathname)) {
    const maintenance = await fetchMaintenanceFlag(request);
    if (maintenance?.enabled) {
      const maintenanceUrl = new URL("/maintenance", request.url);
      return NextResponse.redirect(maintenanceUrl);
    }
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
