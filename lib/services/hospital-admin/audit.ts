import { Prisma } from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";

export async function logHospitalAudit(
  params: {
    hospitalId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    changes?: Prisma.InputJsonValue | null;
  },
  context?: AuditContext,
) {
  await db.auditLog.create({
    data: {
      hospitalId: params.hospitalId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      changes: params.changes ?? undefined,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    },
  });
}

export async function listAuditLogs(hospitalId: string, limit = 25) {
  return db.auditLog.findMany({
    where: { hospitalId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
