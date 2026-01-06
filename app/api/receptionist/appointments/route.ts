import { NextRequest, NextResponse } from "next/server";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";
import { listAppointments, createAppointment } from "@/lib/services/receptionist/appointments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appointmentCreateSchema } from "@/lib/validation/receptionist";
import { assertCsrf } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  await requireReceptionistFromRequest(request);
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospitalId");
  if (!hospitalId) {
    return NextResponse.json({ error: "hospitalId is required" }, { status: 400 });
  }
  const doctorId = searchParams.get("doctorId") ?? undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined;
  const statuses = (searchParams.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as any;

  const data = await listAppointments({
    hospitalId,
    doctorId,
    from,
    to,
    statuses: statuses.length ? statuses : undefined,
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const session = await requireReceptionistFromRequest(request);
  await enforceRateLimit({
    key: `receptionist:create_appt:${session.user.id}`,
    limit: 30,
  });
  const payload = await request.json();
  const parsed = appointmentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await createAppointment(
      {
        hospitalId: parsed.data.hospitalId,
        doctorId: parsed.data.doctorId,
        patientExternalId: parsed.data.patientExternalId,
        patientDisplayName: parsed.data.patientDisplayName,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        notes: parsed.data.notes,
      },
      session.user.id,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PATIENT_ID_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "Patient ID already exists with different details. Use lookup to load the existing patient.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
