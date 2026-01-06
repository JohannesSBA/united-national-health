import { AppointmentStatus, User } from "@/generated/prisma/client";
import {
  ReceptionistHeader,
  receptionistNavItems,
} from "@/app/components/receptionist/receptionist-header";
import { PatientsTable } from "@/app/receptionist/patients/PatientsTable";
import { requireReceptionistHospitalContext } from "@/lib/receptionist/guards";
import { listPatients } from "@/lib/receptionist/patients";

import { Badge } from "@/app/components/ui/badge";
import { WorkspaceNav } from "@/app/components/receptionist/workspace-nav";

type PatientsSearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  status?: string;
  hasUpcoming?: string;
};

export default async function PatientsPage({
  searchParams: resolvedSearchParams,
}: {
  searchParams: PatientsSearchParams;
}) {
  const { session, hospitalId } = await requireReceptionistHospitalContext();

  const page = Number(resolvedSearchParams.page) || 1;
  const sort =
    resolvedSearchParams.sort === "name-asc" ||
    resolvedSearchParams.sort === "next-asc" ||
    resolvedSearchParams.sort === "total-desc"
      ? (resolvedSearchParams.sort as any)
      : "last-desc";

  const status = Object.values(AppointmentStatus).includes(
    resolvedSearchParams.status as AppointmentStatus,
  )
    ? (resolvedSearchParams.status as AppointmentStatus)
    : undefined;

  const hasUpcoming =
    resolvedSearchParams.hasUpcoming === "true"
      ? true
      : resolvedSearchParams.hasUpcoming === "false"
        ? false
        : undefined;

  const patients = await listPatients({
    hospitalId,
    q: resolvedSearchParams.q || "",
    sort,
    status,
    hasUpcoming,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6 p-6">
      <ReceptionistHeader user={session.user as User} />
      <WorkspaceNav
        badge={<Badge variant="outline">Patients overview</Badge>}
        items={receptionistNavItems as any}
      />
      <PatientsTable
        data={patients}
        query={{
          q: resolvedSearchParams.q || "",
          sort,
          status,
          hasUpcoming,
          page,
        }}
      />
    </div>
  );
}
