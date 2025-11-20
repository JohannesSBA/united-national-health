"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { buildAuditContext } from "@/lib/audit-context";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import {
  createStaffMember,
  resetStaffCredentials,
  setStaffStatus,
  updateStaffMember,
} from "@/lib/services/hospital-admin/staff";
import {
  assignStaffToDepartment,
  createDepartment,
  updateDepartment,
} from "@/lib/services/hospital-admin/departments";
import {
  createRoom,
  softDeleteRoom,
  upsertEquipment,
  updateRoom,
} from "@/lib/services/hospital-admin/rooms";
import {
  createSchedule,
  deleteSchedule,
} from "@/lib/services/hospital-admin/schedule";
import {
  upsertInventoryItem,
  softDeleteInventoryItem,
  adjustInventoryQuantity,
} from "@/lib/services/hospital-admin/inventory";
import {
  createStaffSchema,
  departmentAssignmentSchema,
  departmentSchema,
  equipmentSchema,
  inventorySchema,
  roomSchema,
  scheduleSchema,
  updateStaffSchema,
} from "@/lib/validation/hospital-admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { raiseSecurityAlert } from "@/lib/services/global-admin/activity";

export type ActionResult = {
  ok: boolean;
  message: string;
};

function success(message: string): ActionResult {
  return { ok: true, message };
}

function failure(message: string): ActionResult {
  return { ok: false, message };
}

function toObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function getScope() {
  const session = await requireHospitalAdmin();
  const headersList = await headers();
  const auditContext = buildAuditContext(headersList);
  const scope = await getHospitalScope(session.user.id);
  return { session, scope, auditContext };
}

export async function createStaffAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = createStaffSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await createStaffMember(session.user.id, payload, auditContext);
    revalidatePath("/hospitaladmin/staff");
    return success("Staff member created");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to create staff",
    );
  }
}

export async function resetStaffCredentialsAction(
  staffId: string,
  _formData?: FormData,
) {
  try {
    try {
      await enforceRateLimit({
        key: `staff-reset:${staffId}`,
        limit: 3,
        windowSeconds: 60 * 60,
      });
    } catch (error) {
      await raiseSecurityAlert({
        type: "STAFF_RESET_RATE_LIMIT",
        severity: "HIGH",
        description: `Credential reset attempts exceeded for staff ${staffId}`,
      });
      return failure(
        "Too many credential resets. Please wait before trying again.",
      );
    }
    const { session, scope, auditContext } = await getScope();
    await resetStaffCredentials(
      session.user.id,
      scope.hospitalId,
      staffId,
      auditContext,
    );
    revalidatePath(`/hospitaladmin/staff/${staffId}`);
    revalidatePath(`/hospitaladmin/staff`);
    return success("Temporary credentials issued");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to reset credentials",
    );
  }
}

export async function updateStaffAction(staffId: string, formData: FormData) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = updateStaffSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
      staffId,
    });
    await updateStaffMember(
      session.user.id,
      scope.hospitalId,
      staffId,
      payload,
      auditContext,
    );
    revalidatePath(`/hospitaladmin/staff/${staffId}`);
    revalidatePath(`/hospitaladmin/staff`);
    return success("Profile updated");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to update profile",
    );
  }
}

export async function setStaffStatusAction(
  staffId: string,
  status: string,
  _formData?: FormData,
) {
  const { session, scope, auditContext } = await getScope();
  await setStaffStatus(
    session.user.id,
    scope.hospitalId,
    staffId,
    status as "ACTIVE" | "INACTIVE" | "DISABLED",
    auditContext,
  );
  revalidatePath(`/hospitaladmin/staff/${staffId}`);
  revalidatePath(`/hospitaladmin/staff`);
}

export async function createDepartmentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = departmentSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await createDepartment(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/departments`);
    return success("Department created");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to create department",
    );
  }
}

export async function updateDepartmentAction(
  departmentId: string,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = departmentSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await updateDepartment(
      session.user.id,
      scope.hospitalId,
      departmentId,
      payload,
      auditContext,
    );
    revalidatePath(`/hospitaladmin/departments/${departmentId}`);
    revalidatePath(`/hospitaladmin/departments`);
    return success("Department updated");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to update department",
    );
  }
}

export async function assignStaffAction(
  departmentId: string,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = departmentAssignmentSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
      departmentId,
    });
    await assignStaffToDepartment(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/departments/${departmentId}`);
    return success("Assignment recorded");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to assign staff",
    );
  }
}

export async function createRoomAction(
  _prev: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = roomSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await createRoom(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/rooms`);
    return success("Room created");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to create room",
    );
  }
}

export async function updateRoomAction(roomId: string, formData: FormData) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = roomSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await updateRoom(
      session.user.id,
      scope.hospitalId,
      roomId,
      payload,
      auditContext,
    );
    revalidatePath(`/hospitaladmin/rooms`);
    return success("Room updated");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to update room",
    );
  }
}

export async function retireRoomAction(roomId: string, _formData?: FormData) {
  const { session, scope, auditContext } = await getScope();
  await softDeleteRoom(session.user.id, scope.hospitalId, roomId, auditContext);
  revalidatePath(`/hospitaladmin/rooms`);
}

export async function upsertEquipmentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = equipmentSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await upsertEquipment(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/rooms`);
    return success("Equipment saved");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to save equipment",
    );
  }
}

export async function createScheduleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    try {
      await enforceRateLimit({
        key: `schedule-create:${session.user.id}`,
        limit: 20,
        windowSeconds: 60,
      });
    } catch (error) {
      return failure(
        "Too many schedules created at once. Please slow down and try again shortly.",
      );
    }
    const payload = scheduleSchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await createSchedule(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/schedule`);
    return success("Schedule created");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to create schedule",
    );
  }
}

export async function deleteScheduleAction(
  scheduleId: string,
  _formData?: FormData,
) {
  const { session, scope, auditContext } = await getScope();
  await deleteSchedule(
    session.user.id,
    scope.hospitalId,
    scheduleId,
    auditContext,
  );
  revalidatePath(`/hospitaladmin/schedule`);
}

export async function upsertInventoryAction(
  _prev: ActionResult | undefined,
  formData: FormData,
) {
  try {
    const { session, scope, auditContext } = await getScope();
    const payload = inventorySchema.parse({
      ...toObject(formData),
      hospitalId: scope.hospitalId,
    });
    await upsertInventoryItem(session.user.id, payload, auditContext);
    revalidatePath(`/hospitaladmin/analytics`);
    return success("Inventory saved");
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Failed to save inventory",
    );
  }
}

export async function deleteInventoryAction(
  itemId: string,
  _formData?: FormData,
) {
  const { session, scope, auditContext } = await getScope();
  await softDeleteInventoryItem(
    session.user.id,
    scope.hospitalId,
    itemId,
    auditContext,
  );
  revalidatePath(`/hospitaladmin/analytics`);
}

export async function adjustInventoryQuantityAction(
  itemId: string,
  delta: number,
  _formData?: FormData,
) {
  const { session, scope } = await getScope();
  await adjustInventoryQuantity(
    session.user.id,
    scope.hospitalId,
    itemId,
    delta,
  );
  revalidatePath(`/hospitaladmin/analytics`);
}
