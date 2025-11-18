"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { HospitalStatusValue } from "@/lib/types/admin";

export function HospitalStatusActions({
  hospitalId,
  status,
}: {
  hospitalId: string;
  status: HospitalStatusValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{
    status: HospitalStatusValue | null;
    reason: string;
    error: string | null;
  }>({ status: null, reason: "", error: null });

  const openDialog = (nextStatus: HospitalStatusValue) => {
    setDialog({ status: nextStatus, reason: "", error: null });
  };

  const closeDialog = () => {
    setDialog({ status: null, reason: "", error: null });
  };

  const submit = () => {
    if (!dialog.status) return;
    if (!dialog.reason.trim()) {
      setDialog((prev) => ({ ...prev, error: "Reason is required." }));
      return;
    }
    startTransition(async () => {
      const response = await fetch(`/api/globaladmin/hospitals/${hospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          status: dialog.status,
          reason: dialog.reason.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDialog((prev) => ({
          ...prev,
          error: data.error ?? "Failed to update hospital status.",
        }));
        return;
      }
      closeDialog();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => openDialog("ACTIVE")}
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
            onClick={() => openDialog("SUSPENDED")}
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
            onClick={() => openDialog("DECOMMISSIONED")}
          >
            Decommission
          </Button>
        ) : null}
      </div>
      {dialog.status ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              Set status to {dialog.status}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Provide justification. This note is included in audit logs and the
              hospital notification email.
            </p>
            <textarea
              className="mt-4 h-28 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
              value={dialog.reason}
              onChange={(event) =>
                setDialog((prev) => ({
                  ...prev,
                  reason: event.target.value,
                  error: null,
                }))
              }
              placeholder="Describe why this status change is required..."
            />
            {dialog.error ? (
              <p className="mt-2 text-sm text-destructive">{dialog.error}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={isPending || !dialog.reason.trim()}
              >
                {isPending ? "Saving..." : "Confirm change"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
