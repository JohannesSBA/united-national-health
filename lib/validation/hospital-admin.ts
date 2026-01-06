import { z } from "zod";

export const staffRoleEnum = z.enum([
  "DOCTOR",
  "NURSE",
  "LAB_TECHNICIAN",
  "BILLING",
  "RECEPTIONIST",
  "CARE_COORDINATOR",
  "PHARMACIST",
  "ADMINISTRATOR",
]);

export const staffStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DISABLED"]);

export const departmentStatusEnum = z.enum(["ACTIVE", "ARCHIVED"]);

export const roomTypeEnum = z.enum([
  "WARD",
  "ICU",
  "OPERATING_THEATER",
  "LAB",
  "PHARMACY",
  "ADMINISTRATION",
  "OTHER",
]);

export const roomStatusEnum = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);

export const equipmentStatusEnum = z.enum([
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "RETIRED",
]);

export const scheduleTypeEnum = z.enum([
  "DOCTOR_SHIFT",
  "NURSE_SHIFT",
  "ON_CALL",
  "SURGERY",
]);

export const scheduleStatusEnum = z.enum(["DRAFT", "CONFIRMED", "CANCELED"]);

export const inventoryStatusEnum = z.enum([
  "NORMAL",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "ORDERED",
]);

const optionalString = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .transform((value) => value ?? null);

const optionalPhone = z
  .string()
  .max(30)
  .optional()
  .transform((value) =>
    value && value.trim().length > 0 ? value.trim() : null,
  );

const optionalUuid = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  return value;
}, z.string().uuid().optional());

const intFromInput = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return Number(value);
    }
    return value;
  }, z.number().int().min(min).max(max));

const dateValue = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
}, z.date());

export const hospitalScopedSchema = z.object({
  hospitalId: z.string().uuid(),
});

export const createStaffSchema = hospitalScopedSchema
  .extend({
    role: staffRoleEnum,
    name: z.string().trim().min(2).max(120),
    email: z.string().email().toLowerCase(),
    phone: optionalPhone,
    specialization: optionalString,
    licenseNumber: optionalString,
    departmentId: optionalUuid,
    level: optionalString,
  })
  .refine(
    (data) =>
      data.role !== "DOCTOR" ||
      (typeof data.departmentId === "string" && data.departmentId.length > 0),
    {
      message: "Doctors must be assigned to a department.",
      path: ["departmentId"],
    },
  )
  .refine(
    (data) =>
      data.role !== "DOCTOR" ||
      (data.level && data.specialization && data.licenseNumber),
    {
      message:
        "Doctors require level, specialization, and license number information.",
      path: ["level"],
    },
  );

export const updateStaffSchema = hospitalScopedSchema.extend({
  staffId: z.string().uuid(),
  phone: optionalPhone,
  specialization: optionalString,
  licenseNumber: optionalString,
  department: optionalString,
  level: optionalString,
  status: staffStatusEnum.optional(),
});

export const staffFiltersSchema = hospitalScopedSchema.extend({
  search: z.string().trim().max(120).optional(),
  role: staffRoleEnum.optional(),
  status: staffStatusEnum.optional(),
});

export const departmentSchema = hospitalScopedSchema.extend({
  name: z.string().trim().min(2).max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value ?? null),
  headStaffId: z.string().uuid().optional().nullable(),
});

export const departmentAssignmentSchema = hospitalScopedSchema.extend({
  departmentId: z.string().uuid(),
  staffId: z.string().uuid(),
  role: staffRoleEnum,
  isLead: z.coerce.boolean().optional().default(false),
  startsAt: dateValue,
  endsAt: dateValue.optional(),
  notes: optionalString,
});

export const roomSchema = hospitalScopedSchema.extend({
  name: z.string().trim().min(1).max(80),
  code: optionalString,
  type: roomTypeEnum,
  capacity: intFromInput(1, 200),
  occupiedBeds: intFromInput(0, 200).optional(),
  status: roomStatusEnum.optional(),
  notes: optionalString,
});

export const equipmentSchema = hospitalScopedSchema.extend({
  equipmentId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(120),
  serialNumber: optionalString,
  status: equipmentStatusEnum,
  notes: optionalString,
});

export const scheduleSchema = hospitalScopedSchema.extend({
  staffId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(120),
  scheduleType: scheduleTypeEnum,
  startsAt: dateValue,
  endsAt: dateValue,
  status: scheduleStatusEnum.optional(),
});

export const inventorySchema = hospitalScopedSchema.extend({
  itemId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  category: optionalString,
  quantity: intFromInput(0, 100000),
  threshold: intFromInput(0, 100000),
  unit: optionalString,
  status: inventoryStatusEnum,
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffFiltersInput = z.infer<typeof staffFiltersSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentAssignmentInput = z.infer<
  typeof departmentAssignmentSchema
>;
export type RoomInput = z.infer<typeof roomSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
