import { NextResponse } from "next/server";
import { HospitalStatus } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import {
  changeHospitalStatus,
  updateHospitalDetails,
} from "@/lib/services/global-admin/hospitals";

type Params = {
  params: Promise<{
    hospitalId: string;
  }>;
};

export async function PATCH(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  const body = await request.json();
  const { hospitalId } = await context.params;
  if (!hospitalId) {
    return NextResponse.json(
      { error: "Hospital ID is required" },
      { status: 400 },
    );
  }

  try {
    if (body.action === "status") {
      const hospital = await changeHospitalStatus(
        hospitalId,
        body.status as HospitalStatus,
        session.user.id,
        body.reason ?? "",
      );
      return NextResponse.json({ data: hospital });
    }

    const hospital = await updateHospitalDetails(
      hospitalId,
      {
        region: body.region,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        description: body.description,
      },
      session.user.id,
    );

    return NextResponse.json({ data: hospital });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update hospital";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
