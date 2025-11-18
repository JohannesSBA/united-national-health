import { db } from "@/lib/db";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { SystemHealthCard } from "@/app/components/admin/system-health-card";
import { fetchPendingOnboardingActions } from "@/lib/global-admin-data";
import { SystemControlsPanel } from "@/app/components/admin/system/system-controls-panel";

export default async function SystemMonitoringPage() {
  await requireGlobalAdmin();

  const [statusHistory, pendingActions, maintenanceSetting] = await Promise.all(
    [
      db.systemStatus.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
      fetchPendingOnboardingActions(),
      db.systemSetting.findUnique({
        where: { key: "maintenance_mode" },
      }),
    ],
  );

  const latestStatus = statusHistory[0];
  const maintenanceValue = (maintenanceSetting?.value as {
    enabled: boolean;
    reason: string | null;
  }) ?? { enabled: false, reason: null };

  return (
    <AdminPageTemplate
      activeKey="system"
      eyebrow="Operational Health"
      title="System Monitoring"
      description="Observe platform uptime, incident history, and onboarding throughput from a governance lens."
      badge="Scope: Platform Reliability"
    >
      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Maintenance mode</h2>
        <p className="text-sm text-muted-foreground">
          Toggle national maintenance announcements and routing safeguards.
        </p>
        <div className="mt-4">
          <SystemControlsPanel maintenance={maintenanceValue} />
        </div>
      </section>

      {latestStatus ? (
        <SystemHealthCard
          status={{
            overallStatus:
              latestStatus.overallStatus === "DEGRADED"
                ? "degraded"
                : latestStatus.overallStatus === "MAINTENANCE"
                  ? "maintenance"
                  : "operational",
            uptimePercent: latestStatus.uptimePercent,
            lastIncidentAt: latestStatus.lastIncidentAt
              ? latestStatus.lastIncidentAt.toISOString()
              : null,
            deploymentVersion: latestStatus.deploymentVersion,
          }}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 text-sm text-muted-foreground">
          No system status entries have been recorded yet.
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Status History</h2>
        <p className="text-sm text-muted-foreground">
          Recent signals reported by the platform orchestrator.
        </p>
        <ol className="mt-4 space-y-3">
          {statusHistory.map((status) => (
            <li
              key={status.id}
              className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {status.overallStatus
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase())}
                </p>
                <span className="text-xs text-muted-foreground">
                  {new Date(status.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Uptime {status.uptimePercent.toFixed(3)}% &middot; version{" "}
                {status.deploymentVersion}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Onboarding Flow</h2>
        <p className="text-sm text-muted-foreground">
          Active onboarding workflows and required administrative reviews.
        </p>
        <ul className="mt-4 space-y-3">
          {pendingActions.map((action) => (
            <li
              key={action.id}
              className="rounded-xl border border-border/50 bg-muted/40 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{action.hospitalName}</p>
                <span className="text-xs text-muted-foreground">
                  Due {new Date(action.dueDate).toLocaleDateString()}
                </span>
              </div>
              <p className="text-muted-foreground">{action.action}</p>
            </li>
          ))}
        </ul>
      </section>
    </AdminPageTemplate>
  );
}
