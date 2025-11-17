import { Activity, CheckCircle2, XCircle } from "lucide-react";

import { SystemStatusSummary } from "@/lib/global-admin-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
type SystemHealthCardProps = {
  status: SystemStatusSummary;
};

export function SystemHealthCard({ status }: SystemHealthCardProps) {
  const statusIcon =
    status.overallStatus === "operational" ? (
      <CheckCircle2 className="size-5 text-emerald-500" aria-hidden="true" />
    ) : status.overallStatus === "maintenance" ? (
      <Activity className="size-5 text-amber-500" aria-hidden="true" />
    ) : (
      <XCircle className="size-5 text-red-500" aria-hidden="true" />
    );

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="flex items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          System Status
        </CardTitle>
        {statusIcon}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold capitalize">
            {status.overallStatus}
          </p>
          <p className="text-xs text-muted-foreground">
            Uptime (30d): {status.uptimePercent.toFixed(3)}%
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Deployment</dt>
            <dd className="font-medium">{status.deploymentVersion}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last incident</dt>
            <dd className="font-medium">
              {status.lastIncidentAt
                ? new Date(status.lastIncidentAt).toLocaleString()
                : "None reported"}
            </dd>
          </div>
        </dl>
        {/* TODO: Replace static status with real observability widget */}
      </CardContent>
    </Card>
  );
}
