import {
  ActivityCategory,
  AppointmentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";

export type ListAppointmentsParams = {
  hospitalId: string;
  from?: Date;
  to?: Date;
  doctorId?: string;
  statuses?: AppointmentStatus[];
};

export async function listAppointments(params: ListAppointmentsParams) {
  const where: Prisma.AppointmentWhereInput = {
    hospitalId: params.hospitalId,
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
    ...(params.statuses && params.statuses.length
      ? { status: { in: params.statuses } }
      : {}),
    ...(params.from || params.to
      ? {
          startsAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
  };

  return db.appointment.findMany({
    where,
    orderBy: { startsAt: "asc" },
  });
}

export type CreateAppointmentInput = {
  hospitalId: string;
  doctorId: string;
  patientExternalId: string;
  patientDisplayName: string;
  startsAt: Date;
  endsAt: Date;
  notes?: Prisma.InputJsonValue;
};

export async function createAppointment(
  input: CreateAppointmentInput,
  actorId: string,
) {
  const existing = await db.appointment.findFirst({
    where: {
      hospitalId: input.hospitalId,
      patientExternalId: input.patientExternalId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const normalize = (value?: unknown) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";
    const existingNotes = (existing.notes ?? {}) as Record<string, any>;
    const incomingNotes = (input.notes ?? {}) as Record<string, any>;

    const conflicts: boolean[] = [];

    if (
      normalize(existing.patientDisplayName) &&
      normalize(input.patientDisplayName) &&
      normalize(existing.patientDisplayName) !==
        normalize(input.patientDisplayName)
    ) {
      conflicts.push(true);
    }

    if (
      normalize(existingNotes.contactEmail) &&
      normalize(incomingNotes.contactEmail) &&
      normalize(existingNotes.contactEmail) !==
        normalize(incomingNotes.contactEmail)
    ) {
      conflicts.push(true);
    }

    const normalizePhone = (value?: unknown) =>
      typeof value === "string" || typeof value === "number"
        ? String(value).replace(/\s+/g, "")
        : "";
    if (
      normalizePhone(existingNotes.contactPhone) &&
      normalizePhone(incomingNotes.contactPhone) &&
      normalizePhone(existingNotes.contactPhone) !==
        normalizePhone(incomingNotes.contactPhone)
    ) {
      conflicts.push(true);
    }

    if (conflicts.some(Boolean)) {
      const error = new Error("PATIENT_ID_CONFLICT");
      throw error;
    }
  }

  const appointment = await db.appointment.create({
    data: {
      hospitalId: input.hospitalId,
      doctorId: input.doctorId,
      patientExternalId: input.patientExternalId,
      patientDisplayName: input.patientDisplayName,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      notes: input.notes,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  await recordAdminActivity(
    actorId,
    `Created appointment for ${appointment.patientDisplayName}`,
    "Reception Desk",
    ActivityCategory.ACCESS,
    { appointmentId: appointment.id },
  );

  return appointment;
}

export type UpdateAppointmentInput = {
  appointmentId: string;
  startsAt?: Date;
  endsAt?: Date;
  doctorId?: string;
  notes?: Prisma.InputJsonValue | null;
  status?: AppointmentStatus;
};

export async function updateAppointment(
  input: UpdateAppointmentInput,
  actorId: string,
) {
  const appointment = await db.appointment.update({
    where: { id: input.appointmentId },
    data: {
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      ...(input.doctorId ? { doctorId: input.doctorId } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });

  await recordAdminActivity(
    actorId,
    `Updated appointment ${appointment.id}`,
    "Reception Desk",
    ActivityCategory.ACCESS,
  );

  return appointment;
}

export async function cancelAppointment(
  appointmentId: string,
  actorId: string,
) {
  const appointment = await db.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED },
  });

  await recordAdminActivity(
    actorId,
    `Cancelled appointment ${appointment.id}`,
    "Reception Desk",
    ActivityCategory.ACCESS,
  );

  return appointment;
}

export async function getAppointmentById(appointmentId: string) {
  return db.appointment.findUnique({
    where: { id: appointmentId },
  });
}
