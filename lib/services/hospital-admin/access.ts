import { db } from "@/lib/db";

export type HospitalMembershipSummary = {
  hospitalId: string;
  hospital: {
    id: string;
    name: string;
    status: string;
    region: string | null;
    code: string | null;
  };
};

export type HospitalScope = {
  hospitalId: string;
  hospital: HospitalMembershipSummary["hospital"];
  memberships: HospitalMembershipSummary[];
};

export async function getHospitalScope(
  userId: string,
  requestedHospitalId?: string,
): Promise<HospitalScope> {
  const memberships = await db.hospitalUser.findMany({
    where: { userId },
    include: {
      hospital: true,
    },
  });

  if (memberships.length === 0) {
    throw new Error("Hospital admin is not assigned to any hospital");
  }

  const normalizedMemberships: HospitalMembershipSummary[] = memberships
    .filter((membership) => membership.hospital != null)
    .map((membership) => ({
      hospitalId: membership.hospitalId,
      hospital: {
        id: membership.hospital!.id,
        name: membership.hospital!.name,
        status: membership.hospital!.status,
        region: membership.hospital!.region,
        code: membership.hospital!.code,
      },
    }));

  const selected = requestedHospitalId
    ? normalizedMemberships.find(
        (membership) => membership.hospitalId === requestedHospitalId,
      )
    : normalizedMemberships[0];

  if (!selected) {
    throw new Error("Invalid hospital scope");
  }

  return {
    hospitalId: selected.hospitalId,
    hospital: selected.hospital,
    memberships: normalizedMemberships,
  };
}
