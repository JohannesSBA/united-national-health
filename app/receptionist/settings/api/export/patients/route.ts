import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireReceptionistHospitalContext } from "@/lib/receptionist/guards";

export async function GET() {
  const { hospitalId } = await requireReceptionistHospitalContext();
  const now = new Date();

  const anyDb = db as any;

  const patients = await anyDb.$queryRaw<
    {
      patientExternalId: string;
      displayName: string | null;
      lastAppt: Date | null;
      nextAppt: Date | null;
    }[]
  >`
    WITH filtered AS (
      SELECT "patientExternalId", "patientDisplayName", "startsAt", "status"
      FROM "Appointment"
      WHERE "hospitalId" = ${hospitalId}
    ),
    agg AS (
      SELECT
        "patientExternalId",
        (ARRAY_AGG("patientDisplayName" ORDER BY "startsAt" DESC))[1] AS "displayName",
        MAX("startsAt") AS "lastAppt",
        MIN(CASE WHEN "startsAt" > ${now} AND "status" = 'SCHEDULED'::"AppointmentStatus" THEN "startsAt" END) AS "nextAppt"
      FROM filtered
      GROUP BY "patientExternalId"
    )
    SELECT * FROM agg
    ORDER BY "displayName" ASC NULLS LAST;
  `;

  const lines = [
    ["patientExternalId", "displayName", "lastAppt", "nextAppt"].join(","),
    ...patients.map((p) =>
      [
        p.patientExternalId,
        p.displayName ?? "",
        p.lastAppt ? p.lastAppt.toISOString() : "",
        p.nextAppt ? p.nextAppt.toISOString() : "",
      ]
        .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="patients.csv"`,
    },
  });
}
