import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireReceptionist } from "@/lib/require-receptionist";

export type HospitalContext = {
  hospitalId: string;
  hospitalName?: string | null;
  session: Awaited<ReturnType<typeof requireReceptionist>>;
};

export async function requireHospitalContext(
  preferredHospitalId?: string,
): Promise<HospitalContext> {
  const session = await requireReceptionist();

  const memberships = await db.hospitalUser.findMany({
    where: { userId: session.user.id },
    include: { hospital: true },
    orderBy: { createdAt: "asc" },
  });

  if (!memberships.length) {
    redirect("/receptionist");
  }

  const membership =
    (preferredHospitalId &&
      memberships.find((m) => m.hospitalId === preferredHospitalId)) ||
    memberships[0];

  return {
    session,
    hospitalId: membership.hospitalId,
    hospitalName: membership.hospital?.name,
  };
}

export async function requireReceptionistHospitalContext(
  preferredHospitalId?: string,
): Promise<HospitalContext & { staffRole?: string | null }> {
  const context = await requireHospitalContext(preferredHospitalId);

  const staffProfile = await db.staffMember.findFirst({
    where: {
      hospitalId: context.hospitalId,
      userId: context.session.user.id,
      role: "RECEPTIONIST",
    },
  });

  if (!staffProfile) {
    redirect("/");
  }

  return { ...context, staffRole: staffProfile.role };
}
