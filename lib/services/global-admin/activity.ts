import { ActivityCategory, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function recordAdminActivity(
  actor: string,
  action: string,
  scope: string,
  category: ActivityCategory = ActivityCategory.GOVERNANCE,
  metadata?: Prisma.InputJsonValue | null,
) {
  await db.adminActivity.create({
    data: {
      actor,
      action,
      scope,
      category,
      metadata: metadata ?? undefined,
    },
  });
}

export async function raiseSecurityAlert({
  type,
  severity,
  description,
}: {
  type: string;
  severity: string;
  description: string;
}) {
  return db.securityAlert.create({
    data: {
      type,
      severity,
      description,
    },
  });
}

export async function resolveSecurityAlert(
  alertId: string,
  actor: string | null,
) {
  const alert = await db.securityAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      acknowledgedBy: actor ?? undefined,
    },
  });

  if (actor) {
    await recordAdminActivity(
      actor,
      `Resolved security alert ${alert.type}`,
      "Security & Compliance",
      ActivityCategory.SECURITY,
    );
  }

  return alert;
}
