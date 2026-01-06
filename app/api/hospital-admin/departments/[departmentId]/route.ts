import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  archiveDepartment,
  getDepartmentDetail,
  updateDepartment,
} from "@/lib/services/hospital-admin/departments";
import { departmentSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const resolvedParams = await params;
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const department = await getDepartmentDetail(
      scope.hospitalId,
      resolvedParams.departmentId,
    );
    if (!department) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: department });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function PATCH(
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
    const payload = departmentSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const department = await updateDepartment(
      session.user.id,
      scope.hospitalId,
      resolvedParams.departmentId,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: department });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
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
    await archiveDepartment(
      session.user.id,
      scope.hospitalId,
      resolvedParams.departmentId,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
