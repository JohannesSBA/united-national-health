import { z } from "zod";

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

export const appointmentStatusEnum = z.enum([
  "SCHEDULED",
  "CHECKED_IN",
  "CANCELLED",
  "COMPLETED",
]);

export const appointmentCreateSchema = z
  .object({
    hospitalId: z.string().uuid(),
    doctorId: z.string().uuid(),
    patientExternalId: z.string().trim().min(1).max(80),
    patientDisplayName: z.string().trim().min(1).max(120),
    startsAt: dateValue,
    endsAt: dateValue,
    notes: z.any().optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const appointmentUpdateSchema = z.object({
  startsAt: dateValue.optional(),
  endsAt: dateValue.optional(),
  doctorId: z.string().uuid().optional(),
  notes: z.any().optional(),
  status: appointmentStatusEnum.optional(),
});

export const checkInSchema = z.object({
  appointmentId: z.string().uuid(),
  desk: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(200).optional(),
});

export const availabilitySchema = z.object({
  hospitalId: z.string().uuid(),
  doctorId: z.string().uuid(),
  status: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]),
  until: dateValue.optional().nullable(),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;


