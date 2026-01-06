import { db } from "@/lib/db";

export type ReceptionistSettings = {
  slotLengthMinutes: number;
  bufferMinutes: number;
  checkInEarlyMinutes: number;
  allowWalkIns: boolean;
  allowDoubleBooking: boolean;
  defaultNewAppointmentStatus: "SCHEDULED";
  showFrequentCancellationsAlert: boolean;
  frequentCancellationThreshold: number;
  frequentCancellationWindowDays: number;
};

export const defaultReceptionistSettings: ReceptionistSettings = {
  slotLengthMinutes: 15,
  bufferMinutes: 0,
  checkInEarlyMinutes: 30,
  allowWalkIns: false,
  allowDoubleBooking: false,
  defaultNewAppointmentStatus: "SCHEDULED",
  showFrequentCancellationsAlert: true,
  frequentCancellationThreshold: 3,
  frequentCancellationWindowDays: 180,
};

const buildKey = (hospitalId: string) =>
  `hospital:${hospitalId}:receptionist_settings`;

export async function getReceptionistSettings(hospitalId: string) {
  const setting = await db.systemSetting.findUnique({
    where: { key: buildKey(hospitalId) },
  });

  if (!setting) return defaultReceptionistSettings;

  return {
    ...defaultReceptionistSettings,
    ...(setting.value as Partial<ReceptionistSettings>),
  };
}

export async function upsertReceptionistSettings(
  hospitalId: string,
  value: ReceptionistSettings,
  userId?: string,
) {
  return db.systemSetting.upsert({
    where: { key: buildKey(hospitalId) },
    update: { value, updatedBy: userId },
    create: {
      key: buildKey(hospitalId),
      value,
      updatedBy: userId,
    },
  });
}
