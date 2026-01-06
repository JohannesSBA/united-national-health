import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  deleteSchedule,
  getScheduleEntry,
  updateSchedule,
} from "@/lib/services/hospital-admin/schedule";
import { scheduleSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const auditContext = buildAuditContext(request.headers);
  const resolvedParams = await params;

  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const payload = scheduleSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const schedule = await updateSchedule(
      session.user.id,
      scope.hospitalId,
      resolvedParams.scheduleId,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: schedule });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const auditContext = buildAuditContext(request.headers);
  const resolvedParams = await params;

  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    await deleteSchedule(
      session.user.id,
      scope.hospitalId,
      resolvedParams.scheduleId,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const resolvedParams = await params;
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const schedule = await getScheduleEntry(
      scope.hospitalId,
      resolvedParams.scheduleId,
    );
    if (!schedule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: schedule });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
