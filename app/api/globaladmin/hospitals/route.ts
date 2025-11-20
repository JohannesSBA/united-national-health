import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  createHospital,
  listHospitals,
} from "@/lib/services/global-admin/hospitals";
import { buildAuditContext } from "@/lib/audit-context";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const hospitals = await listHospitals();
  return NextResponse.json({ data: hospitals });
}

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const payload = await request.json();
  const auditContext = buildAuditContext(request.headers);
  try {
    const hospital = await createHospital(
      {
        name: payload.name,
        region: payload.region,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        description: payload.description,
        code: payload.code,
      },
      session.user.id,
      auditContext,
    );
    return NextResponse.json({ data: hospital }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register hospital";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
