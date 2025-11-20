import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  createSchedule,
  listSchedule,
} from "@/lib/services/hospital-admin/schedule";
import { scheduleSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const start = parseDate(url.searchParams.get("start"), new Date());
    const defaultEnd = new Date(start.getTime() + 7 * 86400000);
    const end = parseDate(url.searchParams.get("end"), defaultEnd);
    const schedule = await listSchedule(scope.hospitalId, start, end);
    return NextResponse.json({ data: schedule });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const auditContext = buildAuditContext(request.headers);

  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const payload = scheduleSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const schedule = await createSchedule(
      session.user.id,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
