import { ActivityCategory } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";

export type CheckInInput = {
  appointmentId: string;
  receptionistId: string;
  desk?: string;
  notes?: string;
};

export async function checkIn(input: CheckInInput) {
  // Access newly added models via an untyped handle until Prisma types are regenerated
  const anyDb = db as any;

  const appointment = await anyDb.appointment.findUnique({
    where: { id: input.appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }
  if (appointment.status === "CANCELLED") {
    throw new Error("Cannot check-in a cancelled appointment");
  }
  if (appointment.status === "COMPLETED") {
    throw new Error("Cannot check-in a completed appointment");
  }

  const updated = await anyDb.appointment.update({
    where: { id: input.appointmentId },
    data: { status: "CHECKED_IN" },
  });

  await anyDb.checkInEvent.create({
    data: {
      appointmentId: input.appointmentId,
      receptionistId: input.receptionistId,
      desk: input.desk,
      notes: input.notes,
    },
  });

  await recordAdminActivity(
    input.receptionistId,
    `Checked in appointment ${updated.id}`,
    "Reception Desk",
    ActivityCategory.ACCESS,
  );

  return updated;
}
