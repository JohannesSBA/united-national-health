import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { ActivityCategory } from "@/generated/prisma/client";

import { db } from "@/lib/db";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { validateHospitalAdminCsrfToken } from "@/lib/hospital-admin-csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";
import { buildAuditContext } from "@/lib/audit-context";

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;

function passwordMeetsPolicy(password: string) {
  return PASSWORD_POLICY.test(password);
}

export async function POST(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);

  try {
    validateHospitalAdminCsrfToken(request.headers.get("x-csrf-token"));
  } catch {
    return NextResponse.json(
      { error: "Invalid security token. Refresh and try again." },
      { status: 403 },
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await enforceRateLimit({
      key: `hospitaladmin-verify:${session.user.id}:${ipAddress}`,
      limit: 5,
      windowSeconds: 60,
    });
  } catch {
    return NextResponse.json(
      { error: "Too many password attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const password =
    typeof body?.password === "string" ? body.password.trim() : "";

  if (!passwordMeetsPolicy(password)) {
    return NextResponse.json(
      {
        error:
          "Password must be 12+ characters and include uppercase, lowercase, number, and symbol.",
      },
      { status: 400 },
    );
  }

  const hashedPassword = await hashPassword(password);

  await db.$transaction([
    db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: session.user.id,
        },
      },
      update: { password: hashedPassword },
      create: {
        providerId: "credential",
        accountId: session.user.id,
        userId: session.user.id,
        password: hashedPassword,
      },
    }),
    db.user.update({
      where: { id: session.user.id },
      data: { emailVerified: true },
    }),
  ]);

  const auditContext = buildAuditContext(request.headers);

  await recordAdminActivity(
    session.user.id,
    "Verified hospital admin credentials",
    "Hospital Admin Portal",
    ActivityCategory.SECURITY,
    { passwordReset: true },
    auditContext,
  );

  return NextResponse.json({ ok: true });
}
