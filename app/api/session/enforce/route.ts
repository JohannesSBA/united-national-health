import { NextResponse } from "next/server";
import { ActivityCategory } from "@/generated/prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";
import { buildAuditContext } from "@/lib/audit-context";

const TRACKED_ROLES = new Set(["HospitalAdmin", "GlobalAdmin"]);

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = await db.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });
  const trackedRoles = userRoles
    .map((assignment) => assignment.role.name)
    .filter((name) => TRACKED_ROLES.has(name));

  if (trackedRoles.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await auth.api.revokeOtherSessions({
    headers: request.headers,
  });

  const auditContext = buildAuditContext(request.headers);

  await recordAdminActivity(
    session.user.id,
    `Signed in as ${trackedRoles.join("/")}`,
    "Hospital/Admin Session Control",
    ActivityCategory.ACCESS,
    { roles: trackedRoles },
    auditContext,
  );

  return NextResponse.json({ ok: true });
}
