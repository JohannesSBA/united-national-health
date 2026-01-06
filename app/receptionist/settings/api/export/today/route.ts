import { NextResponse } from "next/server";

import { requireReceptionistHospitalContext } from "@/lib/receptionist/guards";
import { db } from "@/lib/db";

export async function GET() {
  const { hospitalId } = await requireReceptionistHospitalContext();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const anyDb = db as any;

  const appointments = await anyDb.appointment.findMany({
    where: { hospitalId, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    include: {
      doctor: { select: { name: true, email: true } },
      checkInEvents: { orderBy: { at: "desc" }, take: 1 },
    },
  });

  const lines = [
    [
      "appointmentId",
      "patientExternalId",
      "patientDisplayName",
      "doctorName",
      "startsAt",
      "endsAt",
      "status",
      "lastCheckInAt",
      "desk",
    ].join(","),
    ...appointments.map((appt: any) =>
      [
        appt.id,
        appt.patientExternalId,
        appt.patientDisplayName,
        appt.doctor?.name || appt.doctor?.email || "",
        appt.startsAt.toISOString(),
        appt.endsAt.toISOString(),
        appt.status,
        appt.checkInEvents?.[0]?.at
          ? new Date(appt.checkInEvents[0].at).toISOString()
          : "",
        appt.checkInEvents?.[0]?.desk || "",
      ]
        .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="appointments-today.csv"`,
    },
  });
}
