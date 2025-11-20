import { NextResponse } from "next/server";

import { ActivityCategory } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";
import { buildAuditContext } from "@/lib/audit-context";

type Params = {
  params: Promise<{ actorId: string }>;
};

export async function GET(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const auditContext = buildAuditContext(request.headers);
  try {
    await enforceRateLimit({
      key: `${session.user.id}:actor-lookup`,
      limit: 30,
      windowSeconds: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Too many lookup requests. Try again soon." },
      { status: 429 },
    );
  }
  const { actorId } = await context.params;
  if (!actorId) {
    return NextResponse.json({ error: "Actor id required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: actorId },
    include: {
      roles: {
        include: { role: true },
      },
      hospitalMemberships: {
        include: { hospital: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Actor not found" }, { status: 404 });
  }

  await recordAdminActivity(
    session.user.id,
    `Looked up actor ${actorId}`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
    { lookupActorId: actorId },
    auditContext,
  );

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles.map((assignment) => assignment.role.name),
      hospitals: user.hospitalMemberships.map(
        (membership) => membership.hospital.name,
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}
