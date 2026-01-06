import { PDFDocument, StandardFonts } from "pdf-lib";
import { RoomStatus, ScheduleType, StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export type HospitalAnalyticsSnapshot = {
  staffByRole: Record<string, number>;
  departmentUtilization: Array<{
    id: string;
    name: string;
    activeAssignments: number;
    head?: string | null;
  }>;
  roomUtilization: {
    totalRooms: number;
    activeRooms: number;
    occupiedBeds: number;
    totalBeds: number;
  };
  upcomingSurgeries: number;
  shiftCoverage: Array<{
    date: string;
    doctorShifts: number;
    nurseShifts: number;
  }>;
  patientFlow?: {
    recordedFor: string;
    patientCount: number;
    admissions: number;
    discharges: number;
    bedOccupancyPercent: number;
    avgWaitMinutes?: number | null;
  } | null;
  inventoryAlerts: Array<{
    id: string;
    name: string;
    quantity: number;
    threshold: number;
  }>;
};

function buildStaffRoleMap(counts: Array<{ role: StaffRole; _count: number }>) {
  const result: Record<string, number> = {
    DOCTOR: 0,
    NURSE: 0,
    LAB_TECHNICIAN: 0,
    BILLING: 0,
    RECEPTIONIST: 0,
    CARE_COORDINATOR: 0,
    PHARMACIST: 0,
    ADMINISTRATOR: 0,
  };
  counts.forEach((entry) => {
    result[entry.role] = entry._count;
  });
  return result;
}

export async function getHospitalAnalyticsSnapshot(
  hospitalId: string,
): Promise<HospitalAnalyticsSnapshot> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [staffCounts, departments, rooms, schedules, patientFlow, inventory] =
    await Promise.all([
      db.staffMember.groupBy({
        where: { hospitalId, deletedAt: null },
        by: ["role"],
        _count: true,
      }),
      db.department.findMany({
        where: { hospitalId, deletedAt: null },
        include: {
          head: { include: { user: true } },
          assignments: {
            where: {
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
          },
        },
      }),
      db.room.findMany({ where: { hospitalId, deletedAt: null } }),
      db.schedule.findMany({
        where: {
          hospitalId,
          deletedAt: null,
          startsAt: { gte: now },
          endsAt: { lte: windowEnd },
        },
      }),
      db.patientFlowSnapshot.findFirst({
        where: { hospitalId },
        orderBy: { recordedFor: "desc" },
      }),
      db.inventoryItem.findMany({
        where: {
          hospitalId,
          deletedAt: null,
        },
      }),
    ]);

  const staffByRole = buildStaffRoleMap(
    staffCounts.map((entry) => ({ role: entry.role, _count: entry._count })),
  );

  const departmentUtilization = departments.map((department) => ({
    id: department.id,
    name: department.name,
    activeAssignments: department.assignments.length,
    head: department.head?.user?.name ?? null,
  }));

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter(
    (room) => room.status === RoomStatus.ACTIVE,
  ).length;
  const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupiedBeds = rooms.reduce(
    (sum, room) => sum + (room.occupiedBeds ?? 0),
    0,
  );

  const upcomingSurgeries = schedules.filter(
    (schedule) => schedule.scheduleType === ScheduleType.SURGERY,
  ).length;

  const shiftCoverage: HospitalAnalyticsSnapshot["shiftCoverage"] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayStart = startOfDay(new Date(now.getTime() + i * 86400000));
    const dayEnd = endOfDay(dayStart);
    const doctorShifts = schedules.filter(
      (schedule) =>
        schedule.scheduleType === ScheduleType.DOCTOR_SHIFT &&
        schedule.startsAt >= dayStart &&
        schedule.startsAt <= dayEnd,
    ).length;
    const nurseShifts = schedules.filter(
      (schedule) =>
        schedule.scheduleType === ScheduleType.NURSE_SHIFT &&
        schedule.startsAt >= dayStart &&
        schedule.startsAt <= dayEnd,
    ).length;
    shiftCoverage.push({
      date: dayStart.toISOString(),
      doctorShifts,
      nurseShifts,
    });
  }

  const inventoryAlerts = inventory
    .filter((item) => item.quantity <= item.threshold)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      threshold: item.threshold,
    }));

  return {
    staffByRole,
    departmentUtilization,
    roomUtilization: {
      totalRooms,
      activeRooms,
      occupiedBeds,
      totalBeds,
    },
    upcomingSurgeries,
    shiftCoverage,
    patientFlow: patientFlow
      ? {
          recordedFor: patientFlow.recordedFor.toISOString(),
          patientCount: patientFlow.patientCount,
          admissions: patientFlow.admissions,
          discharges: patientFlow.discharges,
          bedOccupancyPercent: patientFlow.bedOccupancyPercent,
          avgWaitMinutes: patientFlow.avgWaitMinutes,
        }
      : null,
    inventoryAlerts,
  };
}

export function analyticsToCsv(snapshot: HospitalAnalyticsSnapshot) {
  const lines = [
    "Metric,Value",
    ...Object.entries(snapshot.staffByRole).map(
      ([role, count]) => `Staff - ${role},${count}`,
    ),
    `Rooms Active,${snapshot.roomUtilization.activeRooms}`,
    `Rooms Total,${snapshot.roomUtilization.totalRooms}`,
    `Beds Occupied,${snapshot.roomUtilization.occupiedBeds}`,
    `Beds Total,${snapshot.roomUtilization.totalBeds}`,
    `Upcoming Surgeries,${snapshot.upcomingSurgeries}`,
  ];
  snapshot.departmentUtilization.forEach((dept) => {
    lines.push(`Department ${dept.name} Assignments,${dept.activeAssignments}`);
  });
  snapshot.shiftCoverage.forEach((coverage) => {
    lines.push(
      `Shifts ${coverage.date},Doctors:${coverage.doctorShifts} Nurses:${coverage.nurseShifts}`,
    );
  });
  if (snapshot.patientFlow) {
    lines.push(`Patients Today,${snapshot.patientFlow.patientCount}`);
    lines.push(`Admissions,${snapshot.patientFlow.admissions}`);
    lines.push(`Discharges,${snapshot.patientFlow.discharges}`);
    lines.push(
      `Bed Occupancy %,${snapshot.patientFlow.bedOccupancyPercent.toFixed(1)}`,
    );
  }
  snapshot.inventoryAlerts.forEach((alert) => {
    lines.push(
      `Inventory Alert ${alert.name},${alert.quantity}/${alert.threshold}`,
    );
  });
  return lines.join("\n");
}

export async function analyticsToPdf(snapshot: HospitalAnalyticsSnapshot) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  let cursor = height - 40;

  function writeLine(text: string, size = 12) {
    page.drawText(text, { x: 40, y: cursor, size, font });
    cursor -= size + 6;
  }

  writeLine("Hospital Analytics Report", 16);
  writeLine(new Date().toLocaleString(), 10);
  cursor -= 10;

  writeLine("Staff by role", 14);
  Object.entries(snapshot.staffByRole).forEach(([role, count]) =>
    writeLine(`${role}: ${count}`, 12),
  );

  cursor -= 10;
  writeLine("Room utilization", 14);
  writeLine(
    `Active rooms: ${snapshot.roomUtilization.activeRooms} / ${snapshot.roomUtilization.totalRooms}`,
  );
  writeLine(
    `Beds occupied: ${snapshot.roomUtilization.occupiedBeds} / ${snapshot.roomUtilization.totalBeds}`,
  );

  cursor -= 10;
  writeLine("Upcoming surgeries", 14);
  writeLine(`${snapshot.upcomingSurgeries} scheduled in the next week`);

  cursor -= 10;
  writeLine("Shift coverage (next 7 days)", 14);
  snapshot.shiftCoverage.forEach((coverage) =>
    writeLine(
      `${new Date(coverage.date).toLocaleDateString()}: Doctors ${coverage.doctorShifts} / Nurses ${coverage.nurseShifts}`,
      10,
    ),
  );

  if (snapshot.patientFlow) {
    cursor -= 10;
    writeLine("Patient flow", 14);
    writeLine(`Patients: ${snapshot.patientFlow.patientCount}`);
    writeLine(`Admissions: ${snapshot.patientFlow.admissions}`);
    writeLine(`Discharges: ${snapshot.patientFlow.discharges}`);
    writeLine(
      `Bed occupancy: ${snapshot.patientFlow.bedOccupancyPercent.toFixed(1)}%`,
    );
  }

  if (snapshot.inventoryAlerts.length > 0) {
    cursor -= 10;
    writeLine("Inventory alerts", 14);
    snapshot.inventoryAlerts.forEach((alert) =>
      writeLine(`${alert.name}: ${alert.quantity}/${alert.threshold}`, 10),
    );
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
