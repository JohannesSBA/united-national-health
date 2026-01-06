import { EquipmentStatus, Prisma, RoomStatus } from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";
import { EquipmentInput, RoomInput } from "@/lib/validation/hospital-admin";
import { logHospitalAudit } from "./audit";

function validateCapacity(payload: RoomInput) {
  if (payload.occupiedBeds != null && payload.occupiedBeds > payload.capacity) {
    throw new Error("Occupied beds cannot exceed capacity");
  }
}

async function ensureRoom(hospitalId: string, roomId: string) {
  const room = await db.room.findFirst({
    where: { id: roomId, hospitalId, deletedAt: null },
  });
  if (!room) {
    throw new Error("Room not found");
  }
  return room;
}

export async function listRooms(hospitalId: string) {
  return db.room.findMany({
    where: { hospitalId, deletedAt: null },
    include: {
      equipment: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getRoom(hospitalId: string, roomId: string) {
  return db.room.findFirst({
    where: { id: roomId, hospitalId, deletedAt: null },
    include: {
      equipment: true,
    },
  });
}

export async function createRoom(
  actorId: string,
  payload: RoomInput,
  context?: AuditContext,
) {
  validateCapacity(payload);
  const room = await db.room.create({
    data: {
      hospitalId: payload.hospitalId,
      name: payload.name,
      code: payload.code,
      type: payload.type,
      capacity: payload.capacity,
      occupiedBeds: payload.occupiedBeds ?? 0,
      status: payload.status ?? RoomStatus.ACTIVE,
      notes: payload.notes,
    },
  });

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `Created room ${room.name}`,
      resourceType: "Room",
      resourceId: room.id,
    },
    context,
  );

  return room;
}

export async function updateRoom(
  actorId: string,
  hospitalId: string,
  roomId: string,
  payload: RoomInput,
  context?: AuditContext,
) {
  validateCapacity(payload);
  const data: Prisma.RoomUpdateInput = {
    name: payload.name,
    code: payload.code,
    type: payload.type,
    capacity: payload.capacity,
    notes: payload.notes,
  };
  if (payload.occupiedBeds != null) {
    data.occupiedBeds = payload.occupiedBeds;
  }
  if (payload.status) {
    data.status = payload.status;
  }

  const room = await db.room.update({
    where: { id: roomId, hospitalId },
    data,
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Updated room ${room.name}`,
      resourceType: "Room",
      resourceId: room.id,
      changes: payload as unknown as Prisma.JsonValue,
    },
    context,
  );

  return room;
}

export async function softDeleteRoom(
  actorId: string,
  hospitalId: string,
  roomId: string,
  context?: AuditContext,
) {
  const room = await db.room.update({
    where: { id: roomId, hospitalId },
    data: {
      deletedAt: new Date(),
      status: RoomStatus.INACTIVE,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Archived room ${room.name}`,
      resourceType: "Room",
      resourceId: room.id,
    },
    context,
  );

  return room;
}

export async function upsertEquipment(
  actorId: string,
  payload: EquipmentInput,
  context?: AuditContext,
) {
  if (payload.roomId) {
    await ensureRoom(payload.hospitalId, payload.roomId);
  }

  const equipment = payload.equipmentId
    ? await db.equipment.update({
        where: {
          id: payload.equipmentId,
          hospitalId: payload.hospitalId,
          deletedAt: null,
        },
        data: {
          roomId: payload.roomId ?? null,
          name: payload.name,
          type: payload.type,
          serialNumber: payload.serialNumber,
          status: payload.status,
          notes: payload.notes,
        },
      })
    : await db.equipment.create({
        data: {
          hospitalId: payload.hospitalId,
          roomId: payload.roomId ?? null,
          name: payload.name,
          type: payload.type,
          serialNumber: payload.serialNumber,
          status: payload.status,
          notes: payload.notes,
        },
      });

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `${payload.equipmentId ? "Updated" : "Created"} equipment ${
        equipment.name
      }`,
      resourceType: "Equipment",
      resourceId: equipment.id,
    },
    context,
  );

  return equipment;
}

export async function listEquipment(hospitalId: string) {
  return db.equipment.findMany({
    where: { hospitalId, deletedAt: null },
    include: {
      room: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function softDeleteEquipment(
  actorId: string,
  hospitalId: string,
  equipmentId: string,
  context?: AuditContext,
) {
  const equipment = await db.equipment.update({
    where: { id: equipmentId, hospitalId },
    data: {
      deletedAt: new Date(),
      status: EquipmentStatus.RETIRED,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Retired equipment ${equipment.name}`,
      resourceType: "Equipment",
      resourceId: equipment.id,
    },
    context,
  );

  return equipment;
}
