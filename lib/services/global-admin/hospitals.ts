import {
  ActivityCategory,
  HospitalStatus,
  OnboardingPriority,
  OnboardingStatus,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateHospitalCode } from "@/lib/utils";
import { recordAdminActivity } from "./activity";
import {
  normalizeContactEmail,
  normalizeContactPhone,
} from "@/lib/contact-utils";
import { sendHospitalStatusEmail } from "@/lib/email";
import { AuditContext } from "@/lib/audit-context";

export type CreateHospitalInput = {
  name: string;
  region?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  code?: string;
};

async function ensureUniqueContacts({
  contactEmail,
  contactPhone,
  excludeId,
}: {
  contactEmail?: string | null;
  contactPhone?: string | null;
  excludeId?: string;
}) {
  if (contactEmail) {
    const emailConflict = await db.hospital.findFirst({
      where: {
        contactEmail: {
          equals: contactEmail,
          mode: "insensitive",
        },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (emailConflict) {
      throw new Error("Contact email is already assigned to another hospital.");
    }
  }
  if (contactPhone) {
    const phoneConflict = await db.hospital.findFirst({
      where: {
        contactPhone: contactPhone,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (phoneConflict) {
      throw new Error("Contact phone is already assigned to another hospital.");
    }
  }
}

export async function createHospital(
  input: CreateHospitalInput,
  actor: string,
  auditContext?: AuditContext,
) {
  const code = (input.code ?? generateHospitalCode(input.name)).toUpperCase();
  const contactEmail = normalizeContactEmail(input.contactEmail);
  const contactPhone = normalizeContactPhone(input.contactPhone);
  const region = input.region?.trim() || null;
  const description = input.description?.trim() || null;
  await ensureUniqueContacts({
    contactEmail: contactEmail || undefined,
    contactPhone: contactPhone || undefined,
  });
  const hospital = await db.hospital.create({
    data: {
      name: input.name,
      code,
      region,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      description,
      status: HospitalStatus.PENDING,
    },
  });

  const defaultTasks: Array<{
    action: string;
    owner: string;
    dueDays: number;
    priority: OnboardingPriority;
  }> = [
    {
      action: "Approve compliance package and vendor attestations",
      owner: "Policy Review Board",
      dueDays: 7,
      priority: OnboardingPriority.HIGH,
    },
    {
      action: "Assign hospital administrators",
      owner: "Access Governance",
      dueDays: 10,
      priority: OnboardingPriority.MEDIUM,
    },
    {
      action: "Verify data-sharing agreements",
      owner: "Legal & Compliance",
      dueDays: 14,
      priority: OnboardingPriority.MEDIUM,
    },
  ];

  await db.onboardingAction.createMany({
    data: defaultTasks.map((task) => ({
      hospitalId: hospital.id,
      action: task.action,
      owner: task.owner,
      dueDate: new Date(Date.now() + task.dueDays * 24 * 60 * 60 * 1000),
      priority: task.priority,
      status: OnboardingStatus.PENDING,
    })),
  });

  await recordAdminActivity(
    actor,
    `Registered hospital ${hospital.name}`,
    "Platform Governance",
    ActivityCategory.GOVERNANCE,
    undefined,
    auditContext,
  );

  return hospital;
}

export async function updateHospitalDetails(
  hospitalId: string,
  data: {
    region?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
  },
  actor: string,
  auditContext?: AuditContext,
) {
  const contactEmail = normalizeContactEmail(data.contactEmail);
  const contactPhone = normalizeContactPhone(data.contactPhone);
  await ensureUniqueContacts({
    contactEmail: contactEmail || undefined,
    contactPhone: contactPhone || undefined,
    excludeId: hospitalId,
  });
  const hospital = await db.hospital.update({
    where: { id: hospitalId },
    data: {
      region: data.region?.trim() || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      description: data.description?.trim() || null,
    },
  });

  await recordAdminActivity(
    actor,
    `Updated details for ${hospital.name}`,
    "Platform Governance",
    ActivityCategory.GOVERNANCE,
    undefined,
    auditContext,
  );

  return hospital;
}

export async function changeHospitalStatus(
  hospitalId: string,
  status: HospitalStatus,
  actor: string,
  reason: string,
  auditContext?: AuditContext,
) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error("A reason is required to change status.");
  }
  const hospital = await db.hospital.update({
    where: { id: hospitalId },
    data: {
      status,
    },
  });

  const emailLogId =
    hospital.contactEmail &&
    (await sendHospitalStatusEmail({
      to: hospital.contactEmail,
      hospitalName: hospital.name,
      status,
      reason: trimmedReason,
    }));

  await recordAdminActivity(
    actor,
    `Set ${hospital.name} status to ${status} – ${trimmedReason}`,
    "Platform Governance",
    ActivityCategory.GOVERNANCE,
    emailLogId ? { emailLogId } : undefined,
    auditContext,
  );

  return hospital;
}

export async function handleOnboardingDecision(
  onboardingActionId: string,
  decision: "approve" | "reject",
  actor: string,
  auditContext?: AuditContext,
) {
  const status =
    decision === "approve"
      ? OnboardingStatus.COMPLETED
      : OnboardingStatus.REJECTED;

  const onboardingAction = await db.onboardingAction.update({
    where: { id: onboardingActionId },
    data: { status },
  });

  await recordAdminActivity(
    actor,
    `${decision === "approve" ? "Approved" : "Rejected"} onboarding task for ${
      onboardingAction.hospitalId
    }`,
    "Onboarding",
    ActivityCategory.ACCESS,
    undefined,
    auditContext,
  );

  if (decision === "approve") {
    await db.hospital.update({
      where: { id: onboardingAction.hospitalId },
      data: {
        status: HospitalStatus.ACTIVE,
      },
    });
  }

  return onboardingAction;
}

export async function listHospitals() {
  return db.hospital.findMany({
    include: {
      _count: { select: { members: true } },
      onboardingActions: {
        where: { status: { not: OnboardingStatus.COMPLETED } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomOnboardingAction({
  hospitalId,
  action,
  owner,
  dueDate,
  priority,
  actor,
  auditContext,
}: {
  hospitalId: string;
  action: string;
  owner: string;
  dueDate: string;
  priority: OnboardingPriority;
  actor: string;
  auditContext?: AuditContext;
}) {
  if (!hospitalId) {
    throw new Error("Hospital ID required");
  }
  const parsedDate = new Date(dueDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid due date");
  }
  const onboardingAction = await db.onboardingAction.create({
    data: {
      hospitalId,
      action,
      owner,
      dueDate: parsedDate,
      priority,
      status: OnboardingStatus.PENDING,
    },
  });

  await recordAdminActivity(
    actor,
    `Added onboarding task "${action}"`,
    "Onboarding",
    ActivityCategory.ACCESS,
    undefined,
    auditContext,
  );

  return onboardingAction;
}
