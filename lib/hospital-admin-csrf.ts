import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "hospitaladmin_csrf";

export async function ensureHospitalAdminCsrfToken() {
  const store = await cookies();
  let token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    token = randomBytes(32).toString("hex");
  }

  store.set(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return token;
}

export async function validateHospitalAdminCsrfToken(
  headerToken?: string | null,
) {
  const store = await cookies();
  const cookieToken = store.get(COOKIE_NAME)?.value;
  if (!headerToken || !cookieToken) {
    throw new Error("Missing CSRF token");
  }

  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);
  if (
    headerBuffer.length !== cookieBuffer.length ||
    !timingSafeEqual(headerBuffer, cookieBuffer)
  ) {
    throw new Error("Invalid CSRF token");
  }
}
