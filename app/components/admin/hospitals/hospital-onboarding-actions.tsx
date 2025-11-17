"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
  OnboardingPriorityValue,
  OnboardingStatusValue,
} from "@/lib/types/admin";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type Action = {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  priority: OnboardingPriorityValue;
  status: OnboardingStatusValue;
};

export function HospitalOnboardingActions({ actions }: { actions: Action[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  if (!actions.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No pending onboarding items.
      </p>
    );
  }

  const runDecision = async (
    actionId: string,
    decision: "approve" | "reject",
  ) => {
    const confirmed = await confirmAction({
      title: `Confirm ${decision}`,
      description: `Are you sure you want to ${decision} this onboarding task? This will be recorded for audit purposes.`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/onboarding/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <ul className="space-y-2 text-xs">
        {actions.map((action) => (
          <li
            key={action.id}
            className="rounded-lg border border-border/60 p-3"
          >
            <p className="font-medium">{action.action}</p>
            <p className="text-muted-foreground">
              Owner: {action.owner} &middot; Due{" "}
              {new Date(action.dueDate).toLocaleDateString()}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => runDecision(action.id, "approve")}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => runDecision(action.id, "reject")}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
