import { NextResponse } from "next/server";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdminFromRequest } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { createRoom, listRooms } from "@/lib/services/hospital-admin/rooms";
import { roomSchema } from "@/lib/validation/hospital-admin";

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
    const rooms = await listRooms(scope.hospitalId);
    return NextResponse.json({ data: rooms });
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
    const payload = roomSchema.parse({
      ...body,
      hospitalId: scope.hospitalId,
    });
    const room = await createRoom(session.user.id, payload, auditContext);
    return NextResponse.json({ data: room }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 });
  }
}
