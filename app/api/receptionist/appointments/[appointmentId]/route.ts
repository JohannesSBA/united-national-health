import { NextRequest, NextResponse } from "next/server";
import { requireReceptionistFromRequest } from "@/lib/require-receptionist";
import {
  cancelAppointment,
  getAppointmentById,
  updateAppointment,
} from "@/lib/services/receptionist/appointments";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appointmentUpdateSchema } from "@/lib/validation/receptionist";
import { db } from "@/lib/db";
import { assertCsrf } from "@/lib/security/csrf";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const session = await requireReceptionistFromRequest(request);
  const membership = await db.hospitalUser.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership?.hospitalId) {
    return NextResponse.json({ error: "No hospital assigned" }, { status: 403 });
  }

  const { appointmentId } = await context.params;
  const record = await db.appointment.findFirst({
    where: { id: appointmentId, hospitalId: membership.hospitalId },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = await getAppointmentById(appointmentId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const csrfError = assertCsrf(request);
  if (csrfError) return csrfError;
  const session = await requireReceptionistFromRequest(request);
  const membership = await db.hospitalUser.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership?.hospitalId) {
    return NextResponse.json({ error: "No hospital assigned" }, { status: 403 });
  }
  const { appointmentId } = await context.params;

  const record = await db.appointment.findFirst({
    where: { id: appointmentId, hospitalId: membership.hospitalId },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await enforceRateLimit({
    key: `receptionist:update_appt:${session.user.id}`,
    limit: 60,
  });
  const payload = await request.json();

  if (payload.action === "cancel") {
    const data = await cancelAppointment(appointmentId, session.user.id);
    return NextResponse.json({ data });
  }

  if (payload.action === "delete") {
    await db.appointment.delete({
      where: { id: appointmentId, hospitalId: membership.hospitalId },
    });
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "reschedule") {
    const startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;
    if (
      !startsAt ||
      !endsAt ||
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }
    const data = await updateAppointment(
      {
        appointmentId,
        startsAt,
        endsAt,
        status: "SCHEDULED" as any,
      },
      session.user.id,
    );
    return NextResponse.json({ data });
  }

  const parsed = appointmentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = await updateAppointment(
    {
      appointmentId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      doctorId: parsed.data.doctorId,
      notes: parsed.data.notes,
      status: parsed.data.status as any,
    },
    session.user.id,
  );
  return NextResponse.json({ data });
}
