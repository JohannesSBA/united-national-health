import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { createHospitalAdmin } from "@/lib/services/global-admin/hospital-admins";
import { buildAuditContext } from "@/lib/audit-context";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const admins = await db.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            name: "HospitalAdmin",
          },
        },
      },
    },
    include: {
      hospitalMemberships: {
        include: { hospital: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: admins });
}

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const payload = await request.json();
  const auditContext = buildAuditContext(request.headers);
  try {
    const { user, temporaryPassword } = await createHospitalAdmin(
      {
        email: payload.email,
        name: payload.name,
        hospitalIds: payload.hospitalIds ?? [],
      },
      session.user.id,
      auditContext,
    );
    return NextResponse.json(
      { data: user, temporaryPassword },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create hospital admin";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
