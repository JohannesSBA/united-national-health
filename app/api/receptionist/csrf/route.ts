import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { setCsrfCookie, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security/csrf";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";

export async function GET(request: Request) {
  await requireReceptionistFromRequest(request);
  const token = randomUUID();
  const response = NextResponse.json({
    token,
    header: CSRF_HEADER_NAME,
    cookie: CSRF_COOKIE_NAME,
  });
  setCsrfCookie(response, token);
  return response;
}
