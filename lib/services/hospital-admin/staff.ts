import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";

import {
  ActivityCategory,
  DepartmentStatus,
  Prisma,
  UserStatus,
} from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";
import { sendStaffStatusEmail, sendTemporaryPasswordEmail } from "@/lib/email";
import {
  CreateStaffInput,
  StaffFiltersInput,
  UpdateStaffInput,
} from "@/lib/validation/hospital-admin";
import { logHospitalAudit } from "./audit";
import {
  raiseSecurityAlert,
  recordAdminActivity,
} from "@/lib/services/global-admin/activity";

function generateTemporaryPassword() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

async function ensureDepartmentOwnership(
  hospitalId: string,
  departmentId?: string,
) {
  if (!departmentId) {
    return null;
  }
  const department = await db.department.findFirst({
    where: {
      id: departmentId,
      hospitalId,
      deletedAt: null,
      status: DepartmentStatus.ACTIVE,
    },
  });
  if (!department) {
    throw new Error("Selected department is not available for this hospital.");
  }
  return department;
}

const DEPARTMENT_CAPACITY_LIMIT = Number(
  process.env.DEPARTMENT_CAPACITY_LIMIT ?? 50,
);

async function ensureDepartmentCapacity(departmentId: string) {
  const activeCount = await db.staffAssignment.count({
    where: {
      departmentId,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
  });
  if (activeCount >= DEPARTMENT_CAPACITY_LIMIT) {
    throw new Error(
      "Department assignment limit reached. Rebalance staff before adding more members.",
    );
  }
}

async function ensureRole(roleName: string) {
  await db.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });
}

async function ensureHospitalUser(userId: string, hospitalId: string) {
  await db.hospitalUser.upsert({
    where: {
      userId_hospitalId: {
        userId,
        hospitalId,
      },
    },
    update: {},
    create: {
      userId,
      hospitalId,
    },
  });
}

export async function createStaffMember(
  actorId: string,
  data: CreateStaffInput,
  context?: AuditContext,
) {
  const roleName = data.role;
  await ensureRole(roleName);
  const role = await db.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error("Role configuration is missing");
  }

  const existingUser = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error(
      "An account with this email already exists. Reset their credentials instead.",
    );
  }

  const department = await ensureDepartmentOwnership(
    data.hospitalId,
    data.departmentId,
  );
  if (data.role === "DOCTOR" && !department) {
    throw new Error("Doctors must be assigned to an active department.");
  }

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      emailVerified: false,
      status: UserStatus.ACTIVE,
    },
  });

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.account.create({
    data: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
  });

  await ensureHospitalUser(user.id, data.hospitalId);

  await db.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  const staff = await db.staffMember.create({
    data: {
      hospitalId: data.hospitalId,
      userId: user.id,
      role: data.role,
      phone: data.phone,
      specialization: data.specialization,
      licenseNumber: data.licenseNumber,
      department: department?.name ?? null,
      level: data.level,
    },
    include: {
      user: true,
    },
  });

  if (department) {
    await ensureDepartmentCapacity(department.id);
    await db.staffAssignment.create({
      data: {
        hospitalId: data.hospitalId,
        departmentId: department.id,
        staffId: staff.id,
        role: data.role,
        isLead: false,
        startsAt: new Date(),
        notes: "Auto-assigned during staff onboarding",
      },
    });
  }

  const emailLogId = await sendTemporaryPasswordEmail({
    to: user.email,
    name: user.name,
    temporaryPassword,
  });

  await logHospitalAudit(
    {
      hospitalId: data.hospitalId,
      actorId,
      action: `Created staff member ${user.name}`,
      resourceType: "StaffMember",
      resourceId: staff.id,
      changes: {
        role: data.role,
        email: user.email,
        departmentId: data.departmentId ?? null,
      } satisfies Prisma.JsonObject,
    },
    context,
  );

  await recordAdminActivity(
    actorId,
    `Registered ${data.role.toLowerCase()} ${user.name}`,
    "Hospital Staffing",
    ActivityCategory.ACCESS,
    emailLogId ? { emailLogId, staffId: staff.id } : { staffId: staff.id },
    context,
  );

  return staff;
}

export async function listStaffMembers(
  hospitalId: string,
  filters: StaffFiltersInput,
) {
  const where: Prisma.StaffMemberWhereInput = {
    hospitalId,
    deletedAt: null,
  };

  if (filters.role) {
    where.role = filters.role;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.search) {
    where.OR = [
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return db.staffMember.findMany({
    where,
    include: {
      user: true,
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          department: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getStaffMember(hospitalId: string, staffId: string) {
  return db.staffMember.findFirst({
    where: {
      id: staffId,
      hospitalId,
      deletedAt: null,
    },
    include: {
      user: true,
      assignments: {
        include: {
          department: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function updateStaffMember(
  actorId: string,
  hospitalId: string,
  staffId: string,
  payload: UpdateStaffInput,
  context?: AuditContext,
) {
  const data: Prisma.StaffMemberUpdateInput = {
    phone: payload.phone,
    specialization: payload.specialization,
    licenseNumber: payload.licenseNumber,
    department: payload.department,
    level: payload.level,
  };
  if (payload.status) {
    data.status = payload.status;
  }

  const staff = await db.staffMember.update({
    where: {
      id: staffId,
      hospitalId,
    },
    data,
    include: {
      user: true,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Updated staff member ${staff.user.name}`,
      resourceType: "StaffMember",
      resourceId: staff.id,
      changes: payload as unknown as Prisma.JsonValue,
    },
    context,
  );

  return staff;
}

export async function setStaffStatus(
  actorId: string,
  hospitalId: string,
  staffId: string,
  status: "ACTIVE" | "INACTIVE" | "DISABLED",
  context?: AuditContext,
) {
  const staff = await db.staffMember.update({
    where: { id: staffId, hospitalId },
    data: {
      status,
      deletedAt: status === "ACTIVE" ? null : undefined,
    },
    include: { user: true },
  });

  const hospital = await db.hospital.findUnique({
    where: { id: hospitalId },
    select: { name: true },
  });

  await db.user.update({
    where: { id: staff.userId },
    data: {
      status: status === "ACTIVE" ? UserStatus.ACTIVE : UserStatus.DISABLED,
    },
  });

  if (hospital?.name) {
    await sendStaffStatusEmail({
      to: staff.user.email,
      name: staff.user.name,
      status,
      hospitalName: hospital.name,
    }).catch((error) => {
      console.error("[staff] Failed to send status email", error);
    });
  }

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `${status} staff member ${staff.user.name}`,
      resourceType: "StaffMember",
      resourceId: staff.id,
    },
    context,
  );

  await recordAdminActivity(
    actorId,
    `${status} staff member ${staff.user.name}`,
    "Hospital Staffing",
    status === "DISABLED" ? ActivityCategory.SECURITY : ActivityCategory.ACCESS,
    { staffId },
    context,
  );

  if (status === "DISABLED" || status === "ACTIVE") {
    await raiseSecurityAlert({
      type: "STAFF_ACCESS_CHANGE",
      severity: status === "DISABLED" ? "HIGH" : "MEDIUM",
      description: `${staff.user.name} (${staff.user.email}) set to ${status} by ${actorId}`,
    });
  }

  return staff;
}

export async function softDeleteStaff(
  actorId: string,
  hospitalId: string,
  staffId: string,
  context?: AuditContext,
) {
  const staff = await db.staffMember.update({
    where: { id: staffId, hospitalId },
    data: {
      deletedAt: new Date(),
      status: "DISABLED",
    },
    include: { user: true },
  });

  await db.user.update({
    where: { id: staff.userId },
    data: {
      status: UserStatus.DISABLED,
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Soft deleted staff member ${staff.user.name}`,
      resourceType: "StaffMember",
      resourceId: staff.id,
    },
    context,
  );

  return staff;
}

export async function resetStaffCredentials(
  actorId: string,
  hospitalId: string,
  staffId: string,
  context?: AuditContext,
) {
  const staff = await db.staffMember.findFirst({
    where: {
      id: staffId,
      hospitalId,
      deletedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!staff) {
    throw new Error("Staff member not found");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: staff.userId,
      },
    },
    update: {
      password: passwordHash,
      userId: staff.userId,
    },
    create: {
      providerId: "credential",
      accountId: staff.userId,
      userId: staff.userId,
      password: passwordHash,
    },
  });

  await db.user.update({
    where: { id: staff.userId },
    data: {
      emailVerified: false,
      status: UserStatus.ACTIVE,
    },
  });

  const emailLogId = await sendTemporaryPasswordEmail({
    to: staff.user.email,
    name: staff.user.name,
    temporaryPassword,
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Reset credentials for ${staff.user.name}`,
      resourceType: "StaffMember",
      resourceId: staff.id,
      changes: {
        reset: true,
        emailLogId: emailLogId ?? undefined,
      } satisfies Prisma.JsonObject,
    },
    context,
  );

  await recordAdminActivity(
    actorId,
    `Reset credentials for ${staff.user.name}`,
    "Hospital Staffing",
    ActivityCategory.SECURITY,
    emailLogId ? { emailLogId, staffId } : { staffId },
    context,
  );
}
