import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  getRoom,
  softDeleteRoom,
  updateRoom,
} from "@/lib/services/hospital-admin/rooms";
import { roomSchema } from "@/lib/validation/hospital-admin";

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await requireHospitalAdminFromRequest(request);
  const url = new URL(request.url);
  const resolvedParams = await params;
  try {
    const scope = await getHospitalScope(
      session.user.id,
      url.searchParams.get("hospitalId") ?? undefined,
    );
    const room = await getRoom(scope.hospitalId, resolvedParams.roomId);
    if (!room) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: room });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
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
    const payload = roomSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const room = await updateRoom(
      session.user.id,
      scope.hospitalId,
      resolvedParams.roomId,
      payload,
      auditContext,
    );
    return NextResponse.json({ data: room });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
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
    await softDeleteRoom(
      session.user.id,
      scope.hospitalId,
      resolvedParams.roomId,
      auditContext,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
