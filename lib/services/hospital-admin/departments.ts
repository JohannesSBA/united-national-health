import { DepartmentStatus, Prisma } from "@/generated/prisma/client";
import { AuditContext } from "@/lib/audit-context";
import { db } from "@/lib/db";
import {
  DepartmentAssignmentInput,
  DepartmentInput,
} from "@/lib/validation/hospital-admin";
import { logHospitalAudit } from "./audit";

const DEPARTMENT_CAPACITY_LIMIT = Number(
  process.env.DEPARTMENT_CAPACITY_LIMIT ?? 50,
);

async function ensureDepartmentHasCapacity(departmentId: string) {
  const count = await db.staffAssignment.count({
    where: {
      departmentId,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
  });
  if (count >= DEPARTMENT_CAPACITY_LIMIT) {
    throw new Error(
      "Department has reached its staffing capacity. Remove or reassign staff before adding more members.",
    );
  }
}

async function ensureDepartmentOwnership(
  hospitalId: string,
  departmentId: string,
) {
  const department = await db.department.findFirst({
    where: { id: departmentId, hospitalId, deletedAt: null },
  });
  if (!department) {
    throw new Error("Department not found");
  }
  return department;
}

async function ensureStaffInHospital(hospitalId: string, staffId: string) {
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
    throw new Error("Staff member not found in this hospital");
  }
  return staff;
}

export async function listDepartments(hospitalId: string) {
  return db.department.findMany({
    where: { hospitalId, deletedAt: null },
    include: {
      head: { include: { user: true } },
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createDepartment(
  actorId: string,
  payload: DepartmentInput,
  context?: AuditContext,
) {
  if (payload.headStaffId) {
    await ensureStaffInHospital(payload.hospitalId, payload.headStaffId);
  }

  const department = await db.department.create({
    data: {
      hospitalId: payload.hospitalId,
      name: payload.name,
      description: payload.description,
      headStaffId: payload.headStaffId ?? undefined,
    },
    include: {
      head: { include: { user: true } },
    },
  });

  if (payload.headStaffId) {
    await ensureStaffInHospital(payload.hospitalId, payload.headStaffId);
  }

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `Created department ${department.name}`,
      resourceType: "Department",
      resourceId: department.id,
    },
    context,
  );

  return department;
}

export async function updateDepartment(
  actorId: string,
  hospitalId: string,
  departmentId: string,
  payload: DepartmentInput,
  context?: AuditContext,
) {
  if (payload.headStaffId) {
    await ensureStaffInHospital(hospitalId, payload.headStaffId);
  }

  const department = await db.department.update({
    where: { id: departmentId, hospitalId },
    data: {
      name: payload.name,
      description: payload.description,
      headStaffId: payload.headStaffId ?? undefined,
    },
    include: {
      head: { include: { user: true } },
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Updated department ${department.name}`,
      resourceType: "Department",
      resourceId: department.id,
    },
    context,
  );

  return department;
}

export async function archiveDepartment(
  actorId: string,
  hospitalId: string,
  departmentId: string,
  context?: AuditContext,
) {
  const department = await db.department.update({
    where: { id: departmentId, hospitalId },
    data: {
      status: DepartmentStatus.ARCHIVED,
      headStaffId: null,
      deletedAt: new Date(),
    },
  });

  await logHospitalAudit(
    {
      hospitalId,
      actorId,
      action: `Archived department ${department.name}`,
      resourceType: "Department",
      resourceId: department.id,
    },
    context,
  );

  return department;
}

export async function assignStaffToDepartment(
  actorId: string,
  payload: DepartmentAssignmentInput,
  context?: AuditContext,
) {
  const department = await ensureDepartmentOwnership(
    payload.hospitalId,
    payload.departmentId,
  );
  const staff = await ensureStaffInHospital(
    payload.hospitalId,
    payload.staffId,
  );
  await ensureDepartmentHasCapacity(payload.departmentId);

  if (payload.endsAt && payload.endsAt < payload.startsAt) {
    throw new Error("End date must be after the start date");
  }

  const assignment = await db.staffAssignment.create({
    data: {
      hospitalId: payload.hospitalId,
      departmentId: payload.departmentId,
      staffId: payload.staffId,
      role: payload.role,
      isLead: payload.isLead ?? false,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      notes: payload.notes,
    },
    include: {
      department: true,
      staff: { include: { user: true } },
    },
  });

  if (payload.isLead) {
    await db.department.update({
      where: { id: department.id },
      data: { headStaffId: staff.id },
    });
  }

  await logHospitalAudit(
    {
      hospitalId: payload.hospitalId,
      actorId,
      action: `Assigned ${staff.user?.name ?? staff.id} to ${department.name}`,
      resourceType: "StaffAssignment",
      resourceId: assignment.id,
      changes: {
        isLead: payload.isLead ?? false,
      } satisfies Prisma.JsonObject,
    },
    context,
  );

  return assignment;
}

export async function getDepartmentDetail(
  hospitalId: string,
  departmentId: string,
) {
  return db.department.findFirst({
    where: { id: departmentId, hospitalId },
    include: {
      head: { include: { user: true } },
      assignments: {
        include: {
          staff: { include: { user: true } },
        },
        orderBy: { startsAt: "desc" },
      },
    },
  });
}
