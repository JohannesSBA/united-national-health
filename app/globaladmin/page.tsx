import { getGlobalAdminDashboardData } from "@/lib/global-admin-data";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { MetricCard } from "@/app/components/admin/metric-card";
import { SystemHealthCard } from "@/app/components/admin/system-health-card";
import { PendingActionsList } from "@/app/components/admin/pending-actions";
import { ActivityLog } from "@/app/components/admin/activity-log";
import {
  Building2,
  ShieldCheck,
  ActivitySquare,
  ClipboardList,
} from "lucide-react";
import { getAnalyticsSummary } from "@/lib/services/global-admin/analytics";
import { AnalyticsSummary } from "@/app/components/admin/analytics/analytics-summary";
import { AnalyticsExportButton } from "@/app/components/admin/analytics/analytics-export-button";

export default async function GlobalAdminPage() {
  const session = await requireGlobalAdmin();
  const user = session.user;
  const [dashboardData, analyticsSummary] = await Promise.all([
    getGlobalAdminDashboardData(),
    getAnalyticsSummary(),
  ]);
  const pendingActionCount = dashboardData.pendingActions.length;

  return (
    <AdminPageTemplate
      activeKey="dashboard"
      eyebrow="Global Administration"
      title={`Welcome back, ${user.name || user.email}`}
      description="Oversee national governance, confirm compliance posture, and coordinate platform operations. This surface excludes all patient data by design."
      badge="Access scope: Global Admin"
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Hospitals Registered"
          value={dashboardData.totalHospitals}
          description="Facilities approved to connect"
          icon={<Building2 className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Hospital Administrators"
          value={dashboardData.totalHospitalAdmins}
          description="Accounts with hospital-level authority"
          icon={<ShieldCheck className="size-5 text-muted-foreground" />}
        />
        <MetricCard
          title="Deployment Version"
          value={dashboardData.systemStatus.deploymentVersion}
          description="Current platform release"
          icon={<ActivitySquare className="size-5 text-muted-foreground" />}
          footer={
            <p className="text-xs text-muted-foreground">
              {/* TODO: Pull release metadata from CI/CD pipeline */}
              Rolling release cadence every 2 weeks.
            </p>
          }
        />
        <MetricCard
          title="Pending Onboarding"
          value={pendingActionCount}
          description="Workflows awaiting approval"
          icon={<ClipboardList className="size-5 text-muted-foreground" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PendingActionsList actions={dashboardData.pendingActions} />
        </div>
        <SystemHealthCard status={dashboardData.systemStatus} />
      </section>

      <section className="grid gap-6">
        <ActivityLog activity={dashboardData.recentActivity} />
      </section>

      <section className="space-y-4 rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Governance analytics</h2>
            <p className="text-sm text-muted-foreground">
              Aggregated onboarding and governance insights (non-clinical).
            </p>
          </div>
          <AnalyticsExportButton />
        </div>
        <AnalyticsSummary summary={analyticsSummary} />
      </section>
    </AdminPageTemplate>
  );
}
