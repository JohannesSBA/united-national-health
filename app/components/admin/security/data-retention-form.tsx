"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type DataRetention = {
  retentionDays: number;
  legalHold: boolean;
};

export function DataRetentionForm({ policy }: { policy: DataRetention }) {
  const router = useRouter();
  const [state, setState] = useState(policy);
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: "Update data retention",
      description: "Apply the updated retention window for governance data?",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch("/api/globaladmin/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "data_retention", value: state }),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="retention-days">Retention days</Label>
          <Input
            id="retention-days"
            type="number"
            min={30}
            value={state.retentionDays}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                retentionDays: Number(event.target.value),
              }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.legalHold}
            onChange={(event) =>
              setState((prev) => ({ ...prev, legalHold: event.target.checked }))
            }
          />
          Legal hold (pause deletion)
        </label>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save retention policy"}
        </Button>
      </form>
    </>
  );
}
