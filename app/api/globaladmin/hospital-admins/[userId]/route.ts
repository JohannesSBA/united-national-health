import { NextResponse } from "next/server";
import { UserStatus } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  reassignHospitalAdmin,
  resetHospitalAdminPassword,
  updateHospitalAdminStatus,
} from "@/lib/services/global-admin/hospital-admins";
import { buildAuditContext } from "@/lib/audit-context";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const auditContext = buildAuditContext(request.headers);
  const { userId } = await context.params;

  if (body.action === "reassign") {
    await reassignHospitalAdmin(
      userId,
      body.hospitalIds ?? [],
      session.user.id,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "status") {
    await updateHospitalAdminStatus(
      userId,
      body.status as UserStatus,
      session.user.id,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "resetPassword") {
    const result = await resetHospitalAdminPassword(
      userId,
      session.user.id,
      auditContext,
    );
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
