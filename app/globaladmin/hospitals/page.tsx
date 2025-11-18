import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { MetricCard } from "@/app/components/admin/metric-card";
import { Building2, Users } from "lucide-react";
import { listHospitals } from "@/lib/services/global-admin/hospitals";
import { HospitalCreateForm } from "@/app/components/admin/hospitals/hospital-create-form";
import { HospitalList } from "@/app/components/admin/hospitals/hospital-list";
import {
  normalizeContactEmail,
  normalizeContactPhone,
} from "@/lib/contact-utils";

export default async function HospitalsPage() {
  await requireGlobalAdmin();

  const hospitals = await listHospitals();

  const totalMemberships = hospitals.reduce(
    (sum, hospital) => sum + hospital._count.members,
    0,
  );
  const normalizedHospitals = hospitals.map((hospital) => ({
    ...hospital,
    onboardingActions: hospital.onboardingActions.map((action) => ({
      ...action,
      dueDate: action.dueDate.toISOString(),
    })),
  }));
  const contactSets = hospitals.reduce(
    (acc, hospital) => {
      const email = normalizeContactEmail(hospital.contactEmail);
      const phone = normalizeContactPhone(hospital.contactPhone);
      if (email) acc.emails.add(email);
      if (phone) acc.phones.add(phone);
      return acc;
    },
    { emails: new Set<string>(), phones: new Set<string>() },
  );
  const existingContacts = {
    emails: Array.from(contactSets.emails),
    phones: Array.from(contactSets.phones),
  };

  return (
    <AdminPageTemplate
      activeKey="hospitals"
      eyebrow="National Facilities"
      title="Registered Hospitals"
      description="Track which facilities are live on the platform and confirm governance readiness per site."
      badge="Scope: Governance Oversight"
    >
      <section className="grid gap-6 md:grid-cols-2">
        <MetricCard
          title="Hospitals Connected"
          value={hospitals.length}
          description="Approved facilities across the federation"
          icon={<Building2 className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Linked Personnel"
          value={totalMemberships}
          description="Users mapped to a facility profile"
          icon={<Users className="size-5 text-muted-foreground" />}
        />
      </section>
      <section className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Register new hospital</h2>
        <p className="text-sm text-muted-foreground">
          Capture governance contacts, then approve onboarding when ready.
        </p>
        <div className="mt-4">
          <HospitalCreateForm existingContacts={existingContacts} />
        </div>
      </section>
      <section className="grid gap-4">
        <HospitalList
          hospitals={normalizedHospitals}
          existingContacts={existingContacts}
        />
      </section>
    </AdminPageTemplate>
  );
}
