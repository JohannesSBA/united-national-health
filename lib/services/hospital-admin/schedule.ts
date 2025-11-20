import { Prisma, ScheduleStatus } from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";
import { ScheduleInput } from "@/lib/validation/hospital-admin";
import { logHospitalAudit } from "./audit";

async function ensureStaff(hospitalId: string, staffId?: string | null) {
  if (!staffId) return null;
  const staff = await db.staffMember.findFirst({
    where: { id: staffId, hospitalId, deletedAt: null },
    include: { user: true },
  });
  if (!staff) {
    throw new Error("Staff member not found");
  }
  return staff;
}

async function ensureDepartment(
  hospitalId: string,
  departmentId?: string | null,
) {
  if (!departmentId) return null;
  const department = await db.department.findFirst({
    where: { id: departmentId, hospitalId, deletedAt: null },
  });
  if (!department) {
    throw new Error("Department not found");
  }
  return department;
}

async function ensureRoom(hospitalId: string, roomId?: string | null) {
  if (!roomId) return null;
  const room = await db.room.findFirst({
    where: { id: roomId, hospitalId, deletedAt: null },
  });
  if (!room) {
    throw new Error("Room not found");
  }
  return room;
}

async function ensureNoOverlap(
  hospitalId: string,
  staffId: string | null | undefined,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
) {
  if (!staffId) return;
  const overlap = await db.schedule.count({
    where: {
      hospitalId,
      staffId,
      deletedAt: null,
      id: excludeId ? { not: excludeId } : undefined,
      status: { not: ScheduleStatus.CANCELED },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlap > 0) {
    throw new Error("Schedule overlaps with an existing assignment");
  }
}

export async function createSchedule(
  actorId: string,
  payload: ScheduleInput,
  context?: AuditContext,
) {
  if (payload.endsAt <= payload.startsAt) {
    throw new Error("Schedule end time must be after the start time");
  }

  const [staff, department, room] = await Promise.all([
    ensureStaff(payload.hospitalId, payload.staffId ?? undefined),
    ensureDepartment(payload.hospitalId, payload.departmentId ?? undefined),
    ensureRoom(payload.hospitalId, payload.roomId ?? undefined),
  ]);

  await ensureNoOverlap(
    payload.hospitalId,
    payload.staffId ?? null,
    payload.startsAt,
    payload.endsAt,
  );

  const schedule = await db.schedule.create({
    data: {
      hospitalId: payload.hospitalId,
      staffId: payload.staffId ?? null,
      departmentId: payload.departmentId ?? null,
      roomId: payload.roomId ?? null,
      title: payload.title,
      scheduleType: payload.scheduleType,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: payload.status ?? ScheduleStatus.CONFIRMED,
      createdBy: actorId,
    },
    include: {
      staff: { include: { user: true } },
      department: true,
      room: true,
    },
  });

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `Created schedule ${schedule.title}`,
      resourceType: "Schedule",
      resourceId: schedule.id,
    },
    context,
  );

  return schedule;
}

export async function updateSchedule(
  actorId: string,
  hospitalId: string,
  scheduleId: string,
  payload: ScheduleInput,
  context?: AuditContext,
) {
  if (payload.endsAt <= payload.startsAt) {
    throw new Error("Schedule end time must be after the start time");
  }

  await ensureStaff(hospitalId, payload.staffId ?? undefined);
  await ensureDepartment(hospitalId, payload.departmentId ?? undefined);
  await ensureRoom(hospitalId, payload.roomId ?? undefined);

  await ensureNoOverlap(
    hospitalId,
    payload.staffId ?? null,
    payload.startsAt,
    payload.endsAt,
    scheduleId,
  );

  const schedule = await db.schedule.update({
    where: { id: scheduleId, hospitalId },
    data: {
      staffId: payload.staffId ?? null,
      departmentId: payload.departmentId ?? null,
      roomId: payload.roomId ?? null,
      title: payload.title,
      scheduleType: payload.scheduleType,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: payload.status ?? ScheduleStatus.CONFIRMED,
    },
    include: {
      staff: { include: { user: true } },
      department: true,
      room: true,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Updated schedule ${schedule.title}`,
      resourceType: "Schedule",
      resourceId: schedule.id,
      changes: payload as unknown as Prisma.JsonValue,
    },
    context,
  );

  return schedule;
}

export async function listSchedule(
  hospitalId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  return db.schedule.findMany({
    where: {
      hospitalId,
      deletedAt: null,
      startsAt: { gte: windowStart },
      endsAt: { lte: windowEnd },
    },
    include: {
      staff: { include: { user: true } },
      department: true,
      room: true,
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getScheduleEntry(hospitalId: string, scheduleId: string) {
  return db.schedule.findFirst({
    where: { id: scheduleId, hospitalId, deletedAt: null },
    include: {
      staff: { include: { user: true } },
      department: true,
      room: true,
    },
  });
}

export async function deleteSchedule(
  actorId: string,
  hospitalId: string,
  scheduleId: string,
  context?: AuditContext,
) {
  const schedule = await db.schedule.update({
    where: { id: scheduleId, hospitalId },
    data: {
      deletedAt: new Date(),
      status: ScheduleStatus.CANCELED,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Canceled schedule ${schedule.title}`,
      resourceType: "Schedule",
      resourceId: schedule.id,
    },
    context,
  );

  return schedule;
}
