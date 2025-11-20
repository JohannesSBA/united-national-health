import { Prisma } from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";
import { InventoryInput } from "@/lib/validation/hospital-admin";
import { logHospitalAudit } from "./audit";

export async function listInventory(hospitalId: string) {
  return db.inventoryItem.findMany({
    where: { hospitalId, deletedAt: null },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getInventoryItem(hospitalId: string, itemId: string) {
  return db.inventoryItem.findFirst({
    where: { id: itemId, hospitalId, deletedAt: null },
  });
}

export async function upsertInventoryItem(
  actorId: string,
  payload: InventoryInput,
  context?: AuditContext,
) {
  const item = payload.itemId
    ? await db.inventoryItem.update({
        where: { id: payload.itemId, hospitalId: payload.hospitalId },
        data: {
          name: payload.name,
          category: payload.category,
          quantity: payload.quantity,
          threshold: payload.threshold,
          unit: payload.unit,
          status: payload.status,
        },
      })
    : await db.inventoryItem.create({
        data: {
          hospitalId: payload.hospitalId,
          name: payload.name,
          category: payload.category,
          quantity: payload.quantity,
          threshold: payload.threshold,
          unit: payload.unit,
          status: payload.status,
        },
      });

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `${payload.itemId ? "Updated" : "Created"} inventory ${
        item.name
      }`,
      resourceType: "InventoryItem",
      resourceId: item.id,
      changes: payload as unknown as Prisma.JsonValue,
    },
    context,
  );

  return item;
}

export async function softDeleteInventoryItem(
  actorId: string,
  hospitalId: string,
  itemId: string,
  context?: AuditContext,
) {
  const item = await db.inventoryItem.update({
    where: { id: itemId, hospitalId },
    data: {
      deletedAt: new Date(),
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Removed inventory item ${item.name}`,
      resourceType: "InventoryItem",
      resourceId: item.id,
    },
    context,
  );

  return item;
}

export async function adjustInventoryQuantity(
  actorId: string,
  hospitalId: string,
  itemId: string,
  delta: number,
) {
  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, hospitalId, deletedAt: null },
  });
  if (!item) {
    throw new Error("Inventory item not found");
  }
  const nextQuantity = Math.max(0, item.quantity + delta);
  await db.inventoryItem.update({
    where: { id: itemId, hospitalId },
    data: {
      quantity: nextQuantity,
    },
  });
  // No audit log required per requirements
  return nextQuantity;
}
