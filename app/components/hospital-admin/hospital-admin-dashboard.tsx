import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export type HospitalSummary = {
  id: string;
  name: string;
  status: string;
  code?: string | null;
  region?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  description?: string | null;
};

type HospitalAdminDashboardProps = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  hospitals: HospitalSummary[];
};

export function HospitalAdminDashboard({
  user,
  hospitals,
}: HospitalAdminDashboardProps) {
  const sortedHospitals = [...hospitals].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const activeCount = sortedHospitals.filter(
    (hospital) => hospital.status === "ACTIVE",
  ).length;
  const pendingCount = sortedHospitals.filter(
    (hospital) => hospital.status === "PENDING",
  ).length;
  const restrictedCount = sortedHospitals.length - activeCount - pendingCount;

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:py-14">
        <header className="rounded-3xl border border-border/70 bg-card/95 px-6 py-8 shadow-sm md:px-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Hospital administration
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, {user.name || user.email}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Coordinate facility readiness, staffing updates, and access
                reviews for the hospitals assigned to you. All activity is
                logged for compliance.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Account verified
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned hospitals</CardTitle>
              <CardDescription>Facilities under your scope</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {sortedHospitals.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active facilities</CardTitle>
              <CardDescription>Ready for full operations</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {activeCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending onboarding</CardTitle>
              <CardDescription>Awaiting global approval</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {pendingCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Restricted facilities</CardTitle>
              <CardDescription>Suspended or decommissioned</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {restrictedCount}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/70">
              <CardTitle className="text-lg">Hospital directory</CardTitle>
              <CardDescription>
                Snapshot of the facilities that you manage today.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/70">
              {sortedHospitals.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No hospitals are assigned yet. Contact the global
                  administration office for access.
                </div>
              ) : (
                sortedHospitals.map((hospital) => (
                  <div
                    key={hospital.id}
                    className="flex flex-col gap-2 py-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold">{hospital.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {hospital.region ?? "Region not set"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Status: {hospital.status}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex gap-1">
                        <span className="font-medium">Email:</span>
                        <span>
                          {hospital.contactEmail ?? "No contact provided"}
                        </span>
                      </p>
                      <p className="flex gap-1">
                        <span className="font-medium">Phone:</span>
                        <span>
                          {hospital.contactPhone ?? "No contact provided"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/70">
              <CardTitle className="text-lg">Account checklist</CardTitle>
              <CardDescription>
                Keep your operator credentials compliant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="rounded-full border border-emerald-300 bg-emerald-50 p-1 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Email verified</p>
                  <p className="text-xs text-muted-foreground">
                    Permanent password set. Access restored.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="rounded-full border border-primary/30 bg-primary/10 p-1 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Credential hygiene</p>
                  <p className="text-xs text-muted-foreground">
                    Rotate passwords every 90 days. Report suspicious activity
                    immediately to the security desk.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="rounded-full border border-primary/30 bg-primary/10 p-1 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Facility briefs</p>
                  <p className="text-xs text-muted-foreground">
                    Review staffing rosters and compliance attestations each
                    week to stay ahead of issues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Quick navigation
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Jump into hospital operations
            </h2>
            <p className="text-sm text-muted-foreground">
              These areas stay constrained to your assigned hospitals and never
              expose PHI.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                href: "/hospitaladmin/staff",
                title: "Staff",
                description: "Create accounts, review access, view rosters.",
              },
              {
                href: "/hospitaladmin/departments",
                title: "Departments",
                description: "Assign heads and manage department coverage.",
              },
              {
                href: "/hospitaladmin/rooms",
                title: "Facilities",
                description: "Track rooms, equipment, and capacity.",
              },
              {
                href: "/hospitaladmin/schedule",
                title: "Schedule",
                description: "Publish duty rosters without overlap.",
              },
              {
                href: "/hospitaladmin/analytics",
                title: "Analytics",
                description: "Export operational metrics for your hospital.",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-4 transition hover:border-primary hover:bg-primary/5"
              >
                <span className="text-base font-semibold">{item.title}</span>
                <span className="text-sm text-muted-foreground">
                  {item.description}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary group-hover:translate-x-1 transition">
                  Open →
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
