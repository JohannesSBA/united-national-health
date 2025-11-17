import { db } from "@/lib/db";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { IntegrationList } from "@/app/components/admin/system/integration-list";
import { IntegrationCreateForm } from "@/app/components/admin/system/integration-create-form";
import { RolePolicyEditor } from "@/app/components/admin/system/role-policy-editor";

export default async function SettingsPage() {
  await requireGlobalAdmin();

  const [
    latestStatus,
    globalAdminCount,
    hospitalAdminCount,
    integrations,
    rolePolicies,
  ] = await Promise.all([
    db.systemStatus.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.userRole.count({
      where: {
        role: {
          name: "GlobalAdmin",
        },
      },
    }),
    db.userRole.count({
      where: {
        role: {
          name: "HospitalAdmin",
        },
      },
    }),
    db.integrationKey.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.rolePolicy.findMany({
      orderBy: { roleName: "asc" },
    }),
  ]);

  const deploymentVersion =
    latestStatus?.deploymentVersion ??
    process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION ??
    "unknown";

  const normalizedPolicies = rolePolicies.map((policy) => ({
    roleName: policy.roleName,
    permissions: (policy.permissions as string[]) ?? [],
  }));

  return (
    <AdminPageTemplate
      activeKey="settings"
      eyebrow="Platform Configuration"
      title="Governance Settings"
      description="Reference platform versions, trusted origins, and policy contacts for the national admin console."
      badge="Scope: Configuration"
    >
      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Deployment</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current release</dt>
            <dd className="font-medium">{deploymentVersion}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Uptime last 30 days</dt>
            <dd className="font-medium">
              {latestStatus
                ? `${latestStatus.uptimePercent.toFixed(3)}%`
                : "Collecting telemetry"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Console URL</dt>
            <dd className="font-medium">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Trusted origins</dt>
            <dd className="font-medium">
              {process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
                process.env.NEXT_PUBLIC_APP_URL ??
                "http://localhost:3000"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Access Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Global Admins</p>
            <p className="text-3xl font-semibold">{globalAdminCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Hospital Admins</p>
            <p className="text-3xl font-semibold">{hospitalAdminCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Integrations & API keys</h2>
        <p className="text-sm text-muted-foreground">
          Manage tokens for trusted systems (credentials never show patient
          data).
        </p>
        <div className="mt-4 space-y-4">
          <IntegrationCreateForm />
          <IntegrationList integrations={integrations} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Role policies</h2>
        <p className="text-sm text-muted-foreground">
          Define which governance permissions each role can exercise.
        </p>
        <div className="mt-4">
          <RolePolicyEditor policies={normalizedPolicies} />
        </div>
      </section>
    </AdminPageTemplate>
  );
}
