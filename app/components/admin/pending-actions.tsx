import { PendingOnboardingAction } from "@/lib/global-admin-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

type PendingActionsListProps = {
  actions: PendingOnboardingAction[];
};

const priorityStyles: Record<PendingOnboardingAction["priority"], string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-sky-600 bg-sky-50 border-sky-200",
};

export function PendingActionsList({ actions }: PendingActionsListProps) {
  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Pending Onboarding Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track outstanding approvals before facilities go live.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All onboarding workflows are clear.
          </p>
        ) : (
          <ul className="space-y-3">
            {actions.map((action) => (
              <li
                key={action.id}
                className="rounded-xl border border-border/60 bg-muted/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{action.hospitalName}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${priorityStyles[action.priority]}`}
                  >
                    {action.priority.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm">{action.action}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Owner: {action.owner}</span>
                  <span>
                    Due:{" "}
                    {new Date(action.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {/* TODO: Link into onboarding workflow detail page */}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
