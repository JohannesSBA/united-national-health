import { NextResponse } from "next/server";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  createHospital,
  listHospitals,
} from "@/lib/services/global-admin/hospitals";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const hospitals = await listHospitals();
  return NextResponse.json({ data: hospitals });
}

export async function POST(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  const payload = await request.json();
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
  );
  return NextResponse.json({ data: hospital }, { status: 201 });
}
