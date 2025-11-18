import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { resolveSecurityAlert } from "@/lib/services/global-admin/activity";

type Params = { params: Promise<{ alertId: string }> };

export async function PATCH(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const { alertId } = await context.params;
  const alert = await resolveSecurityAlert(alertId, session.user.id);
  return NextResponse.json({ data: alert });
}
