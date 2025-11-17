"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type SecurityAlert = {
  id: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  createdAt: string;
};

export function SecurityAlertsPanel({ alerts }: { alerts: SecurityAlert[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const resolve = async (alertId: string) => {
    const confirmed = await confirmAction({
      title: "Resolve alert",
      description: "Mark this security alert as resolved?",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/security/alerts/${alertId}`, {
        method: "PATCH",
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-border/60 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {alert.type} &middot;{" "}
                <span className="uppercase text-destructive">
                  {alert.severity}
                </span>
              </p>
              {!alert.resolved ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => resolve(alert.id)}
                >
                  Resolve
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Resolved</span>
              )}
            </div>
            <p className="text-muted-foreground">{alert.description}</p>
            <p className="text-xs text-muted-foreground">
              Logged {new Date(alert.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
