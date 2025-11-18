import { db } from "@/lib/db";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { ActivityLog } from "@/app/components/admin/activity-log";
import { MfaPolicyForm } from "@/app/components/admin/security/mfa-policy-form";
import { DataRetentionForm } from "@/app/components/admin/security/data-retention-form";
import { AccessPolicyPanel } from "@/app/components/admin/security/access-policy-panel";
import { SecurityAlertsPanel } from "@/app/components/admin/security/security-alerts-panel";
import { ActivityExportButton } from "@/app/components/admin/security/activity-export-button";

export default async function SecurityPage() {
  await requireGlobalAdmin();

  const [
    activities,
    highPriorityActions,
    systemSettings,
    policies,
    alerts,
    hospitals,
  ] = await Promise.all([
    db.adminActivity.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
    db.onboardingAction.findMany({
      where: {
        priority: "HIGH",
        status: {
          not: "COMPLETED",
        },
      },
      include: {
        hospital: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    }),
    db.systemSetting.findMany({
      where: {
        key: {
          in: ["mfa_policy", "data_retention"],
        },
      },
    }),
    db.accessPolicy.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    db.securityAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.hospital.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const mfaPolicy = (systemSettings.find(
    (setting) => setting.key === "mfa_policy",
  )?.value as { required: boolean; enforcedFor: string[] }) ?? {
    required: true,
    enforcedFor: ["GLOBAL_ADMIN"],
  };
  const dataRetention = (systemSettings.find(
    (setting) => setting.key === "data_retention",
  )?.value as { retentionDays: number; legalHold: boolean }) ?? {
    retentionDays: 365,
    legalHold: false,
  };

  return (
    <AdminPageTemplate
      activeKey="security"
      eyebrow="Security & Compliance"
      title="Platform Protections"
      description="Audit privileged activity, confirm policy follow-through, and make sure PHI never reaches this console."
      badge="Scope: Compliance Operations"
    >
      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">MFA Policy</h2>
            <p className="text-sm text-muted-foreground">
              Enforce multi-factor authentication for privileged roles.
            </p>
            <div className="mt-4">
              <MfaPolicyForm policy={mfaPolicy} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              Configure retention windows for governance data (never PHI).
            </p>
            <div className="mt-4">
              <DataRetentionForm policy={dataRetention} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Cross-hospital access policies
        </h2>
        <p className="text-sm text-muted-foreground">
          Draft, approve, or revoke data-sharing policies without touching PHI.
        </p>
        <div className="mt-4">
          <AccessPolicyPanel policies={policies} hospitals={hospitals} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Security alerts</h2>
        <p className="text-sm text-muted-foreground">
          Review and resolve access violations or suspicious events.
        </p>
        <div className="mt-4">
          <SecurityAlertsPanel
            alerts={alerts.map((alert) => ({
              ...alert,
              createdAt: alert.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">High-Priority Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Immediate governance follow-ups owned by compliance partners.
        </p>
        <ul className="mt-4 space-y-3">
          {highPriorityActions.map((action) => (
            <li
              key={action.id}
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {action.hospital.name} · {action.owner}
                </p>
                <span className="text-xs">
                  Due {new Date(action.dueDate).toLocaleDateString()}
                </span>
              </div>
              <p>{action.action}</p>
            </li>
          ))}
        </ul>
      </section>

      <ActivityLog
        actions={<ActivityExportButton />}
        activity={activities.map((activity) => ({
          id: activity.id,
          actor: activity.actor,
          action: activity.action,
          scope: activity.scope,
          timestamp: activity.createdAt.toISOString(),
        }))}
      />
    </AdminPageTemplate>
  );
}
