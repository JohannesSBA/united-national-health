"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type MaintenanceSetting = { enabled: boolean; reason: string | null };

export function SystemControlsPanel({
  maintenance,
}: {
  maintenance: MaintenanceSetting;
}) {
  const router = useRouter();
  const [formState, setFormState] = useState<MaintenanceSetting>({
    enabled: maintenance.enabled,
    reason: maintenance.reason,
  });
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: formState.enabled
        ? "Enable maintenance mode"
        : "Disable maintenance mode",
      description: "Confirm updating the maintenance banner for all users?",
    });
    if (!confirmed) {
      return;
    }
    startTransition(async () => {
      await fetch("/api/globaladmin/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "maintenance_mode",
          value: formState,
        }),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            id="maintenance-enabled"
            type="checkbox"
            checked={formState.enabled}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                enabled: event.target.checked,
              }))
            }
          />
          <Label htmlFor="maintenance-enabled" className="font-medium">
            Enable maintenance mode
          </Label>
        </div>
        <div>
          <Label htmlFor="maintenance-reason">Reason</Label>
          <Input
            id="maintenance-reason"
            placeholder="Optional announcement"
            value={formState.reason ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, reason: event.target.value }))
            }
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save maintenance settings"}
        </Button>
      </form>
    </>
  );
}
