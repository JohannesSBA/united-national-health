import { NextRequest, NextResponse } from "next/server";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";
import { setDoctorStatus } from "@/lib/services/receptionist/availability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { availabilitySchema } from "@/lib/validation/receptionist";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ doctorId: string }> },
) {
  const session = await requireReceptionistFromRequest(request);
  const { doctorId } = await context.params;
  await enforceRateLimit({
    key: `receptionist:set_availability:${session.user.id}`,
    limit: 60,
  });
  const payload = await request.json();
  const parsed = availabilitySchema.safeParse({ ...payload, doctorId });
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


