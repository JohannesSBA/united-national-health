import {
  ActivityCategory,
  HospitalStatus,
  OnboardingPriority,
  OnboardingStatus,
  Prisma,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateHospitalCode } from "@/lib/utils";
import { recordAdminActivity } from "./activity";

export type CreateHospitalInput = {
  name: string;
  region?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  code?: string;
};

export async function createHospital(
  input: CreateHospitalInput,
  actor: string,
) {
  const code = (input.code ?? generateHospitalCode(input.name)).toUpperCase();
  const hospital = await db.hospital.create({
    data: {
      name: input.name,
      code,
      region: input.region,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      description: input.description,
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
  );

  return hospital;
}

export async function updateHospitalDetails(
  hospitalId: string,
  data: Prisma.HospitalUpdateInput,
  actor: string,
) {
  const hospital = await db.hospital.update({
    where: { id: hospitalId },
    data,
  });

  await recordAdminActivity(
    actor,
    `Updated details for ${hospital.name}`,
    "Platform Governance",
    ActivityCategory.GOVERNANCE,
  );

  return hospital;
}

export async function changeHospitalStatus(
  hospitalId: string,
  status: HospitalStatus,
  actor: string,
) {
  const hospital = await db.hospital.update({
    where: { id: hospitalId },
    data: {
      status,
    },
  });

  await recordAdminActivity(
    actor,
    `Set ${hospital.name} status to ${status}`,
    "Platform Governance",
    ActivityCategory.GOVERNANCE,
  );

  return hospital;
}

export async function handleOnboardingDecision(
  onboardingActionId: string,
  decision: "approve" | "reject",
  actor: string,
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
}: {
  hospitalId: string;
  action: string;
  owner: string;
  dueDate: string;
  priority: OnboardingPriority;
  actor: string;
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
  );

  return onboardingAction;
}
