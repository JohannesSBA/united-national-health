import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  createStaffMember,
  listStaffMembers,
} from "@/lib/services/hospital-admin/staff";
import {
  createStaffSchema,
  staffFiltersSchema,
} from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(request: Request) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const filters = staffFiltersSchema.parse({
      hospitalId: scope.hospitalId,
      search: url.searchParams.get("search") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    const staff = await listStaffMembers(scope.hospitalId, filters);
    return NextResponse.json({ data: staff });
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
    const payload = createStaffSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const staff = await createStaffMember(
      session.user.id,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
