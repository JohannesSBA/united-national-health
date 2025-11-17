"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { HospitalStatusValue } from "@/lib/types/admin";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

export function HospitalStatusActions({
  hospitalId,
  status,
}: {
  hospitalId: string;
  status: HospitalStatusValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const updateStatus = async (nextStatus: HospitalStatusValue) => {
    const confirmed = await confirmAction({
      title: `Change hospital status`,
      description: `Set this hospital to ${nextStatus}? Users may lose or gain access based on this change.`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/hospitals/${hospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: nextStatus }),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => updateStatus("ACTIVE")}
          >
            Activate
          </Button>
        ) : null}
        {status !== "SUSPENDED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => updateStatus("SUSPENDED")}
          >
            Suspend
          </Button>
        ) : null}
        {status !== "DECOMMISSIONED" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => updateStatus("DECOMMISSIONED")}
          >
            Decommission
          </Button>
        ) : null}
      </div>
    </>
  );
}
