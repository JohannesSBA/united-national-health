import { NextRequest, NextResponse } from "next/server";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";
import { checkIn } from "@/lib/services/receptionist/checkin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { checkInSchema } from "@/lib/validation/receptionist";
import { assertCsrf } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const session = await requireReceptionistFromRequest(request);
  await enforceRateLimit({
    key: `receptionist:checkin:${session.user.id}`,
    limit: 120,
  });
  const payload = await request.json();
  const parsed = checkInSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = await checkIn({
    appointmentId: parsed.data.appointmentId,
    receptionistId: session.user.id,
    desk: parsed.data.desk,
    notes: parsed.data.notes,
  });

  return NextResponse.json({ data });
}

