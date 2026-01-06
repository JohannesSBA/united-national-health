import { ActivityCategory } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";

export async function listDoctorAvailability(hospitalId: string) {
  const anyDb = db as any;
  return anyDb.doctorAvailability.findMany({
    where: { hospitalId },
    orderBy: { updatedAt: "desc" },
  });
}

export type SetDoctorStatusInput = {
  hospitalId: string;
  doctorId: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  until?: Date | null;
};

export async function setDoctorStatus(input: SetDoctorStatusInput, actorId: string) {
  const anyDb = db as any;

  const record = await anyDb.doctorAvailability.upsert({
    where: {
      doctorId_hospitalId: {
        doctorId: input.doctorId,
        hospitalId: input.hospitalId,
      },
    },
    update: {
      status: input.status,
      until: input.until ?? null,
      updatedBy: actorId,
    },
    create: {
      doctorId: input.doctorId,
      hospitalId: input.hospitalId,
      status: input.status,
      until: input.until ?? null,
      updatedBy: actorId,
    },
  });

  await recordAdminActivity(
    actorId,
    `Set doctor ${input.doctorId} status to ${input.status}`,
    "Reception Desk",
    ActivityCategory.ACCESS,
  );

  return record;
}


