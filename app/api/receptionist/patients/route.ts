import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";

export async function GET(request: NextRequest) {
  await requireReceptionistFromRequest(request);
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospitalId");
  const patientExternalId = searchParams.get("patientExternalId");
  const patientName = searchParams.get("patientName");

  if (!hospitalId || (!patientExternalId && !patientName)) {
    return NextResponse.json(
      { error: "hospitalId and patientExternalId or patientName are required" },
      { status: 400 },
    );
  }

  const where: any = {
    hospitalId,
    OR: [],
  };

  if (patientExternalId) {
    where.OR.push({ patientExternalId });
  }
  if (patientName) {
    where.OR.push({
      patientDisplayName: {
        contains: patientName,
        mode: "insensitive",
      },
    });
  }

  const match = await db.appointment.findFirst({
    where,
    orderBy: { startsAt: "desc" },
  });

  if (!match) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      patientExternalId: match.patientExternalId,
      patientDisplayName: match.patientDisplayName,
      doctorId: match.doctorId,
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      notes: match.notes,
    },
  });
}
