import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  configureMfaPolicy,
  toggleMaintenanceMode,
  updateDataRetention,
  upsertSystemSetting,
} from "@/lib/services/global-admin/system";
import { db } from "@/lib/db";
import { buildAuditContext } from "@/lib/audit-context";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const settings = await db.systemSetting.findMany();
  return NextResponse.json({ data: settings });
}

export async function PATCH(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const auditContext = buildAuditContext(request.headers);

  switch (body.key) {
    case "maintenance_mode": {
      await toggleMaintenanceMode(
        body.value.enabled,
        body.value.reason,
        session.user.id,
        auditContext,
      );
      break;
    }
    case "mfa_policy": {
      await configureMfaPolicy(
        body.value.required,
        body.value.enforcedFor ?? [],
        session.user.id,
        auditContext,
      );
      break;
    }
    case "data_retention": {
      await updateDataRetention(
        body.value.retentionDays,
        body.value.legalHold ?? false,
        session.user.id,
        auditContext,
      );
      break;
    }
    default: {
      await upsertSystemSetting(body.key, body.value, session.user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
