import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";

import { ActivityCategory } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;

function passwordMeetsPolicy(password: string) {
  return PASSWORD_POLICY.test(password);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE" },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await enforceRateLimit({
      key: `user-onboarding:${session.user.id}:${ipAddress}`,
      limit: 5,
      windowSeconds: 60,
    });
  } catch {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
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

  const roleNames = user.roles.map((r) => r.role.name);
  let redirectTo = "/";
  if (roleNames.includes("RECEPTIONIST")) redirectTo = "/receptionist";
  else if (roleNames.includes("HOSPITAL_ADMIN")) redirectTo = "/hospitaladmin";
  else if (roleNames.includes("GLOBAL_ADMIN")) redirectTo = "/globaladmin";
  else if (roleNames.includes("NURSE")) redirectTo = "/clinical";

  await recordAdminActivity(
    session.user.id,
    "Completed onboarding password reset",
    "Onboarding",
    ActivityCategory.SECURITY,
    { passwordReset: true },
  );

  return NextResponse.json({ ok: true, redirectTo });
}
