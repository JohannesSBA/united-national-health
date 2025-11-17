import { createHash, randomBytes } from "crypto";
import {
  ActivityCategory,
  CrossAccessPolicyStatus,
  IntegrationStatus,
  Prisma,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { recordAdminActivity } from "./activity";

export async function upsertSystemSetting(
  key: string,
  value: Prisma.InputJsonValue,
  actor: string,
) {
  return db.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: actor },
    create: { key, value, updatedBy: actor },
  });
}

export async function toggleMaintenanceMode(
  enabled: boolean,
  reason: string | null,
  actor: string,
) {
  await upsertSystemSetting("maintenance_mode", { enabled, reason }, actor);

  await recordAdminActivity(
    actor,
    `${enabled ? "Enabled" : "Disabled"} maintenance mode`,
    "System Operations",
    ActivityCategory.SYSTEM,
  );
}

export async function configureMfaPolicy(
  required: boolean,
  enforcedFor: string[],
  actor: string,
) {
  await upsertSystemSetting("mfa_policy", { required, enforcedFor }, actor);

  await recordAdminActivity(
    actor,
    `${required ? "Required" : "Relaxed"} MFA policy`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
  );
}

export async function updateDataRetention(
  retentionDays: number,
  legalHold: boolean,
  actor: string,
) {
  await upsertSystemSetting(
    "data_retention",
    { retentionDays, legalHold },
    actor,
  );

  await recordAdminActivity(
    actor,
    `Updated data retention to ${retentionDays} days`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
  );
}

function generateIntegrationToken() {
  return randomBytes(24).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createIntegrationKey(
  { name, description }: { name: string; description?: string },
  actor: string,
) {
  const token = generateIntegrationToken();
  const tokenHash = hashToken(token);

  const integration = await db.integrationKey.create({
    data: {
      name,
      description,
      tokenHash,
      lastFour: token.slice(-4),
      status: IntegrationStatus.ACTIVE,
      createdBy: actor,
      lastRotatedAt: new Date(),
    },
  });

  await recordAdminActivity(
    actor,
    `Created integration key ${name}`,
    "Integrations",
    ActivityCategory.SYSTEM,
  );

  return { integration, token };
}

export async function rotateIntegrationKey(id: string, actor: string) {
  const token = generateIntegrationToken();
  const tokenHash = hashToken(token);

  const integration = await db.integrationKey.update({
    where: { id },
    data: {
      tokenHash,
      lastFour: token.slice(-4),
      lastRotatedAt: new Date(),
    },
  });

  await recordAdminActivity(
    actor,
    `Rotated integration key ${integration.name}`,
    "Integrations",
    ActivityCategory.SYSTEM,
  );

  return { integration, token };
}

export async function setIntegrationStatus(
  id: string,
  status: IntegrationStatus,
  actor: string,
) {
  const integration = await db.integrationKey.update({
    where: { id },
    data: { status },
  });

  await recordAdminActivity(
    actor,
    `${status === IntegrationStatus.ACTIVE ? "Re-enabled" : "Disabled"} integration ${integration.name}`,
    "Integrations",
    ActivityCategory.SECURITY,
  );

  return integration;
}

export async function createAccessPolicy(
  {
    name,
    description,
    hospitalScope,
  }: { name: string; description?: string; hospitalScope: string[] },
  actor: string,
) {
  const policy = await db.accessPolicy.create({
    data: {
      name,
      description,
      hospitalScope,
      status: CrossAccessPolicyStatus.DRAFT,
    },
  });

  await recordAdminActivity(
    actor,
    `Drafted access policy ${name}`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
  );

  return policy;
}

export async function approveAccessPolicy(id: string, actor: string) {
  const policy = await db.accessPolicy.update({
    where: { id },
    data: {
      status: CrossAccessPolicyStatus.ACTIVE,
      approvedBy: actor,
    },
  });

  await recordAdminActivity(
    actor,
    `Approved cross-hospital policy ${policy.name}`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
  );

  return policy;
}

export async function revokeAccessPolicy(id: string, actor: string) {
  const policy = await db.accessPolicy.update({
    where: { id },
    data: {
      status: CrossAccessPolicyStatus.REVOKED,
      approvedBy: actor,
    },
  });

  await recordAdminActivity(
    actor,
    `Revoked cross-hospital policy ${policy.name}`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
  );

  return policy;
}

export async function getMaintenanceSetting() {
  const setting = await db.systemSetting.findUnique({
    where: { key: "maintenance_mode" },
  });

  const value = (setting?.value as { enabled?: boolean; reason?: string }) ?? {
    enabled: false,
    reason: null,
  };

  return {
    enabled: Boolean(value.enabled),
    reason: value.reason ?? null,
  };
}
