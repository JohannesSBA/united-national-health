import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { assignStaffToDepartment } from "@/lib/services/hospital-admin/departments";
import { departmentAssignmentSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
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
    const payload = departmentAssignmentSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
      departmentId: resolvedParams.departmentId,
    });
    const assignment = await assignStaffToDepartment(
      session.user.id,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
