import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { createCustomOnboardingAction } from "@/lib/services/global-admin/hospitals";
import { OnboardingPriority } from "@/generated/prisma/client";
import { buildAuditContext } from "@/lib/audit-context";

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const auditContext = buildAuditContext(request.headers);

  const action = await createCustomOnboardingAction({
    hospitalId: body.hospitalId,
    action: body.action,
    owner: body.owner,
    dueDate: body.dueDate,
    priority: (body.priority ?? "MEDIUM") as OnboardingPriority,
    actor: session.user.id,
    auditContext,
  });

  return NextResponse.json({ data: action }, { status: 201 });
}
