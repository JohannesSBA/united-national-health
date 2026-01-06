import { Prisma, AppointmentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type PatientListItem = {
  patientExternalId: string;
  displayName: string | null;
  lastAppt: Date | null;
  nextAppt: Date | null;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
};

export type PatientListResult = {
  patients: PatientListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type ListPatientsParams = {
  hospitalId: string;
  q?: string;
  status?: AppointmentStatus;
  hasUpcoming?: boolean;
  sort?: "last-desc" | "name-asc" | "next-asc" | "total-desc";
  page?: number;
  pageSize?: number;
};

export async function listPatients(params: ListPatientsParams): Promise<PatientListResult> {
  const {
    hospitalId,
    q,
    status,
    hasUpcoming,
    sort = "last-desc",
    page = 1,
    pageSize = 20,
  } = params;

  const allowedStatuses = Object.values(AppointmentStatus);
  const statusFilter =
    status && allowedStatuses.includes(status) ? status : undefined;

  const offset = (Math.max(1, page) - 1) * pageSize;

  const conditions: Prisma.Sql[] = [Prisma.sql`"hospitalId" = ${hospitalId}`];

  if (q) {
    const term = `%${q}%`;
    conditions.push(
      Prisma.sql`("patientDisplayName" ILIKE ${term} OR "patientExternalId" ILIKE ${term})`,
    );
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.sql` AND `)}`;

  let orderSql: Prisma.Sql;
  switch (sort) {
    case "name-asc":
      orderSql = Prisma.sql`"displayName" ASC NULLS LAST`;
      break;
    case "next-asc":
      orderSql = Prisma.sql`"nextAppt" ASC NULLS LAST`;
      break;
    case "total-desc":
      orderSql = Prisma.sql`"totalCount" DESC`;
      break;
    case "last-desc":
    default:
      orderSql = Prisma.sql`"lastAppt" DESC NULLS LAST`;
      break;
  }

  const rows = await db.$queryRaw<
    (PatientListItem & { totalPatients: number })[]
  >(
    Prisma.sql`
WITH filtered AS (
  SELECT
    "patientExternalId",
    "patientDisplayName",
    "startsAt",
    "status"
  FROM "Appointment"
  ${whereClause}
),
agg AS (
  SELECT
    "patientExternalId",
    (ARRAY_AGG("patientDisplayName" ORDER BY "startsAt" DESC))[1] AS "displayName",
    MAX("startsAt") AS "lastAppt",
    MIN(CASE WHEN "startsAt" > NOW() AND "status" = ${AppointmentStatus.SCHEDULED}::"AppointmentStatus" THEN "startsAt" END) AS "nextAppt",
    COUNT(*) AS "totalCount",
    COUNT(*) FILTER (WHERE "status" = ${AppointmentStatus.COMPLETED}::"AppointmentStatus") AS "completedCount",
    COUNT(*) FILTER (WHERE "status" = ${AppointmentStatus.CANCELLED}::"AppointmentStatus") AS "cancelledCount"
  FROM filtered
  GROUP BY "patientExternalId"
  ${
    statusFilter
      ? Prisma.sql`HAVING COUNT(*) FILTER (WHERE "status" = ${statusFilter}::"AppointmentStatus") > 0`
      : Prisma.empty
  }
),
scoped AS (
  SELECT *, COUNT(*) OVER() AS "totalPatients"
  FROM agg
  ${
    hasUpcoming === true
      ? Prisma.sql`WHERE "nextAppt" IS NOT NULL`
      : hasUpcoming === false
        ? Prisma.sql`WHERE "nextAppt" IS NULL`
        : Prisma.empty
  }
)
SELECT *
FROM scoped
ORDER BY ${orderSql}
LIMIT ${pageSize} OFFSET ${offset};
    `,
  );

  return {
    patients: rows.map((row) => ({
      patientExternalId: row.patientExternalId,
      displayName: row.displayName,
      lastAppt: row.lastAppt,
      nextAppt: row.nextAppt,
      totalCount: Number(row.totalCount),
      completedCount: Number(row.completedCount),
      cancelledCount: Number(row.cancelledCount),
    })),
    total: rows[0]?.totalPatients ? Number(rows[0].totalPatients) : 0,
    page,
    pageSize,
  };
}

export type PatientDetail = {
  latest: any;
  next: any;
  upcoming: any[];
  past: any[];
  statusCounts: Record<string, number>;
  avgCheckInLeadMinutes: number | null;
  totals: { total: number; cancelled: number; completed: number };
};

export async function getPatientDetail(
  hospitalId: string,
  patientExternalId: string,
): Promise<PatientDetail | null> {
  const exists = await db.appointment.findFirst({
    where: { hospitalId, patientExternalId },
    select: { id: true },
  });
  if (!exists) return null;

  const now = new Date();

  const [latest, next, upcoming, past, statusCountsRaw, avgCheckInLead] =
    await Promise.all([
      db.appointment.findFirst({
        where: { hospitalId, patientExternalId },
        orderBy: { startsAt: "desc" },
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          checkInEvents: { orderBy: { at: "desc" }, take: 1 },
        },
      }),
      db.appointment.findFirst({
        where: {
          hospitalId,
          patientExternalId,
          status: AppointmentStatus.SCHEDULED,
          startsAt: { gt: now },
        },
        orderBy: { startsAt: "asc" },
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          checkInEvents: { orderBy: { at: "desc" }, take: 1 },
        },
      }),
      db.appointment.findMany({
        where: {
          hospitalId,
          patientExternalId,
          startsAt: { gt: now },
        },
        orderBy: { startsAt: "asc" },
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          checkInEvents: { orderBy: { at: "desc" }, take: 1 },
        },
        take: 20,
      }),
      db.appointment.findMany({
        where: {
          hospitalId,
          patientExternalId,
          startsAt: { lte: now },
        },
        orderBy: { startsAt: "desc" },
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          checkInEvents: { orderBy: { at: "desc" }, take: 1 },
        },
        take: 50,
      }),
      db.appointment.groupBy({
        by: ["status"],
        _count: true,
        where: { hospitalId, patientExternalId },
      }),
      db.$queryRaw<{ avg_seconds: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("Appointment"."startsAt" - "CheckInEvent"."at"))) AS avg_seconds
        FROM "CheckInEvent"
        JOIN "Appointment" ON "Appointment"."id" = "CheckInEvent"."appointmentId"
        WHERE "Appointment"."hospitalId" = ${hospitalId}
          AND "Appointment"."patientExternalId" = ${patientExternalId};
      `,
    ]);

  const statusCounts: Record<string, number> = {};
  statusCountsRaw.forEach((row) => {
    statusCounts[row.status] = row._count;
  });

  const avgCheckInLeadMinutes =
    avgCheckInLead?.[0]?.avg_seconds !== null &&
    avgCheckInLead?.[0]?.avg_seconds !== undefined
      ? Math.round((Number(avgCheckInLead[0].avg_seconds) / 60) * 100) / 100
      : null;

  return {
    latest,
    next,
    upcoming,
    past,
    statusCounts,
    avgCheckInLeadMinutes,
    totals: {
      total: statusCountsRaw.reduce((acc, row) => acc + row._count, 0),
      cancelled: statusCounts[AppointmentStatus.CANCELLED] ?? 0,
      completed: statusCounts[AppointmentStatus.COMPLETED] ?? 0,
    },
  };
}
