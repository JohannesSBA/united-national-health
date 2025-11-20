import { redirect } from "next/navigation";

import { HospitalAdminDashboard } from "@/app/components/hospital-admin/hospital-admin-dashboard";
import { HospitalAdminVerification } from "@/app/components/hospital-admin/hospital-admin-verification";
import { db } from "@/lib/db";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { ensureHospitalAdminCsrfToken } from "@/lib/hospital-admin-csrf";

export default async function HospitalAdminPage() {
  const session = await requireHospitalAdmin();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      hospitalMemberships: {
        include: { hospital: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.emailVerified) {
    const csrfToken = ensureHospitalAdminCsrfToken();
    return (
      <HospitalAdminVerification
        user={{
          name: user.name,
          email: user.email,
        }}
        csrfToken={csrfToken}
      />
    );
  }

  const hospitals = user.hospitalMemberships
    .map((membership) => membership.hospital)
    .filter((hospital): hospital is NonNullable<typeof hospital> =>
      Boolean(hospital),
    )
    .map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      status: hospital.status,
      code: hospital.code,
      region: hospital.region,
      contactEmail: hospital.contactEmail,
      contactPhone: hospital.contactPhone,
      description: hospital.description,
    }));

  return (
    <HospitalAdminDashboard
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
      }}
      hospitals={hospitals}
    />
  );
}
