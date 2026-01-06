import { NextRequest, NextResponse } from "next/server";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";
import { listDoctorAvailability, setDoctorStatus } from "@/lib/services/receptionist/availability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { availabilitySchema } from "@/lib/validation/receptionist";

export async function GET(request: NextRequest) {
  await requireReceptionistFromRequest(request);
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospitalId");
  if (!hospitalId) {
    return NextResponse.json({ error: "hospitalId is required" }, { status: 400 });
  }
  const data = await listDoctorAvailability(hospitalId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await requireReceptionistFromRequest(request);
  await enforceRateLimit({
    key: `receptionist:set_availability:${session.user.id}`,
    limit: 60,
  });
  const payload = await request.json();
  const parsed = availabilitySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await setDoctorStatus(
    {
      hospitalId: parsed.data.hospitalId,
      doctorId: parsed.data.doctorId,
      status: parsed.data.status,
      until: parsed.data.until ?? null,
    },
    session.user.id,
  );
  return NextResponse.json({ data });
}


