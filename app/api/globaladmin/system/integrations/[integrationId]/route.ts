import { NextRequest, NextResponse } from "next/server";
import { IntegrationStatus } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  rotateIntegrationKey,
  setIntegrationStatus,
} from "@/lib/services/global-admin/system";
import { buildAuditContext } from "@/lib/audit-context";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await context.params;
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const auditContext = buildAuditContext(request.headers);

  if (body.action === "rotate") {
    const result = await rotateIntegrationKey(
      integrationId,
      session.user.id,
      auditContext,
    );
    return NextResponse.json(result);
  }

  if (body.action === "status") {
    const integration = await setIntegrationStatus(
      integrationId,
      body.status as IntegrationStatus,
      session.user.id,
      auditContext,
    );
    return NextResponse.json({ data: integration });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
