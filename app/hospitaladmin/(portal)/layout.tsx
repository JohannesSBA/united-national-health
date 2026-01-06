import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { HospitalAdminShell } from "@/app/components/hospital-admin/hospital-admin-shell";
import { HospitalAdminVerification } from "@/app/components/hospital-admin/hospital-admin-verification";
import { db } from "@/lib/db";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";

export default async function HospitalAdminPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
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
    return (
      <HospitalAdminVerification
        user={{
          name: user.name,
          email: user.email,
        }}
      />
    );
  }

  const hospital = user.hospitalMemberships.find(
    (membership) => membership.hospital,
  )?.hospital;

  if (!hospital) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-card/90 p-10 text-center">
        <p className="text-lg font-semibold">
          No hospital assignment found for this account.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact the national governance office to request access.
        </p>
      </div>
    );
  }

  return (
    <HospitalAdminShell
      user={{ name: user.name, email: user.email }}
      hospital={{
        id: hospital.id,
        name: hospital.name,
        status: hospital.status,
        region: hospital.region,
      }}
    >
      {children}
    </HospitalAdminShell>
  );
}
