import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  getStaffMember,
  setStaffStatus,
  softDeleteStaff,
  updateStaffMember,
} from "@/lib/services/hospital-admin/staff";
import { updateStaffSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const resolvedParams = await params;
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const staff = await getStaffMember(
      scope.hospitalId,
      resolvedParams.staffId,
    );
    if (!staff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: staff });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
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
    const payload = updateStaffSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
      staffId: resolvedParams.staffId,
    });

    const { status, ...profileData } = payload;
    if (status) {
      await setStaffStatus(
        session.user.id,
        scope.hospitalId,
        resolvedParams.staffId,
        status,
        auditContext,
      );
    }

    const hasProfileChanges = [
      profileData.phone,
      profileData.specialization,
      profileData.licenseNumber,
      profileData.department,
      profileData.level,
    ].some((value) => value !== undefined);

    if (hasProfileChanges) {
      await updateStaffMember(
        session.user.id,
        scope.hospitalId,
        resolvedParams.staffId,
        profileData,
        auditContext,
      );
    }

    const staff = await getStaffMember(
      scope.hospitalId,
      resolvedParams.staffId,
    );
    return NextResponse.json({ data: staff });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
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
    await softDeleteStaff(
      session.user.id,
      scope.hospitalId,
      resolvedParams.staffId,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
