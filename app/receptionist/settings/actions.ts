"use server";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireReceptionistHospitalContext } from "@/lib/receptionist/guards";
import {
  defaultReceptionistSettings,
  upsertReceptionistSettings,
} from "@/lib/settings/receptionistSettings";

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(10)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: "Must include at least one letter and one number.",
    }),
  confirmNewPassword: z.string(),
});

export async function changePasswordAction(formData: FormData) {
  const { session } = await requireReceptionistHospitalContext();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword")?.toString(),
    newPassword: formData.get("newPassword")?.toString(),
    confirmNewPassword: formData.get("confirmNewPassword")?.toString(),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  if (parsed.data.newPassword !== parsed.data.confirmNewPassword) {
    return { error: { formErrors: ["Passwords do not match"], fieldErrors: {} } };
  }

  const account = await db.account.findFirst({
    where: {
      userId: session.user.id,
      OR: [
        { providerId: "credential" },
        { password: { not: null } },
      ],
    },
  });

  if (!account) {
    // No credential account: allow set without current password
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.account.create({
      data: {
        providerId: "credential",
        accountId: session.user.id,
        userId: session.user.id,
        password: passwordHash,
      },
    });
    return { success: true };
  }

  if (account.password) {
    const match = await verifyPassword(parsed.data.currentPassword || "", account.password);
    if (!match) {
      return { error: { formErrors: ["Current password is incorrect"], fieldErrors: {} } };
    }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.account.update({
    where: { id: account.id },
    data: { password: passwordHash },
  });
  return { success: true };
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
});

export async function updateProfileAction(formData: FormData) {
  const { session, hospitalId } = await requireReceptionistHospitalContext();
  const parsed = profileSchema.safeParse({
    name: formData.get("name")?.toString(),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/receptionist/settings");
  return { success: true };
}

const settingsSchema = z.object({
  slotLengthMinutes: z.enum(["10", "15", "20", "30", "45", "60"]).transform(Number),
  bufferMinutes: z.coerce.number().min(0).max(30),
  checkInEarlyMinutes: z.coerce.number().min(0).max(240),
  allowWalkIns: z.coerce.boolean(),
  allowDoubleBooking: z.coerce.boolean(),
  defaultNewAppointmentStatus: z.enum(["SCHEDULED"]).default("SCHEDULED"),
  showFrequentCancellationsAlert: z.coerce.boolean(),
  frequentCancellationThreshold: z.coerce.number().min(0).max(20),
  frequentCancellationWindowDays: z.coerce.number().min(1).max(365),
});

export async function upsertReceptionistSettingsAction(formData: FormData) {
  const { hospitalId, session } = await requireReceptionistHospitalContext();
  const parsed = settingsSchema.safeParse({
    slotLengthMinutes: formData.get("slotLengthMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    checkInEarlyMinutes: formData.get("checkInEarlyMinutes"),
    allowWalkIns: formData.get("allowWalkIns"),
    allowDoubleBooking: formData.get("allowDoubleBooking"),
    defaultNewAppointmentStatus: formData.get("defaultNewAppointmentStatus") || "SCHEDULED",
    showFrequentCancellationsAlert: formData.get("showFrequentCancellationsAlert"),
    frequentCancellationThreshold: formData.get("frequentCancellationThreshold"),
    frequentCancellationWindowDays: formData.get("frequentCancellationWindowDays"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const value = {
    ...defaultReceptionistSettings,
    ...parsed.data,
  };

  await upsertReceptionistSettings(hospitalId, value, session.user.id);
  revalidatePath("/receptionist/settings");
  return { success: true };
}
