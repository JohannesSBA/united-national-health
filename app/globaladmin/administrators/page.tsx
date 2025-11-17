import { db } from "@/lib/db";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { AdminCreateForm } from "@/app/components/admin/admins/admin-create-form";
import { AdminList } from "@/app/components/admin/admins/admin-list";

export default async function AdministratorsPage() {
  await requireGlobalAdmin();

  const [globalAdmins, hospitalAdmins, hospitals] = await Promise.all([
    db.userRole.findMany({
      where: {
        role: {
          name: "GlobalAdmin",
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    }),
    db.userRole.findMany({
      where: {
        role: {
          name: "HospitalAdmin",
        },
      },
      include: {
        user: {
          include: {
            hospitalMemberships: {
              include: {
                hospital: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    }),
    db.hospital.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hospitalAdminRecords = hospitalAdmins.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    hospitalMemberships: user.hospitalMemberships,
  }));

  return (
    <AdminPageTemplate
      activeKey="administrators"
      eyebrow="Role Oversight"
      title="Administrative Directory"
      description="Review which personnel hold elevated access and confirm each facility retains appropriate administrators."
      badge="Scope: Identity Governance"
    >
      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create hospital admin</h2>
        <p className="text-sm text-muted-foreground">
          Provision a hospital-level administrator with scoped facility access.
        </p>
        <div className="mt-4">
          <AdminCreateForm hospitals={hospitals} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Global Administrators</h2>
        <p className="text-sm text-muted-foreground">
          Strategic operators with nationwide permissions.
        </p>
        <ul className="mt-4 space-y-3">
          {globalAdmins.map(({ user }) => (
            <li
              key={user.id}
              className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3"
            >
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Hospital Administrators</h2>
            <p className="text-sm text-muted-foreground">
              Local teams accountable for facility-level controls.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {hospitalAdminRecords.length} assigned
          </span>
        </div>
        <div className="mt-4">
          <AdminList admins={hospitalAdminRecords} hospitals={hospitals} />
        </div>
      </section>
    </AdminPageTemplate>
  );
}
