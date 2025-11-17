import Link from "next/link";
import { AdministrativeActivity } from "@/lib/global-admin-data";
import { History } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
export type ActivityLogProps = {
  activity: AdministrativeActivity[];
  actions?: ReactNode;
};

export function ActivityLog({ activity, actions }: ActivityLogProps) {
  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <History
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <CardTitle className="text-base font-semibold">
              Administrative Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest governance and platform operations.
            </p>
          </div>
        </div>
        {actions ? <div className="ml-auto">{actions}</div> : null}
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No administrative events have been recorded yet.
          </p>
        ) : (
          <ol className="space-y-4">
            {activity.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-border/50 bg-muted/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{event.action}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.actor} &middot; {event.scope}
                </p>
                <Link
                  href={`/globaladmin/security?log=${event.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View audit details
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
