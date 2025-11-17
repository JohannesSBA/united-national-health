"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { UserStatusValue } from "@/lib/types/admin";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type HospitalOption = { id: string; name: string };

export function AdminActions({
  userId,
  status,
  hospitals,
}: {
  userId: string;
  status: UserStatusValue;
  hospitals: HospitalOption[];
}) {
  const router = useRouter();
  const [selectedHospital, setSelectedHospital] = useState(
    hospitals[0]?.id ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const callApi = (body: unknown) =>
    fetch(`/api/globaladmin/hospital-admins/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const reassign = async () => {
    if (!selectedHospital) return;
    const confirmed = await confirmAction({
      title: "Reassign administrator",
      description: "Confirm updating this administrator's hospital assignment?",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await callApi({ action: "reassign", hospitalIds: [selectedHospital] });
      router.refresh();
    });
  };

  const toggleStatus = async () => {
    const targetStatus = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const confirmed = await confirmAction({
      title: `${targetStatus === "ACTIVE" ? "Reactivate" : "Suspend"} admin`,
      description: `Are you sure you want to set this administrator to ${targetStatus}?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await callApi({
        action: "status",
        status: targetStatus,
      });
      router.refresh();
    });
  };

  const resetPassword = async () => {
    const confirmed = await confirmAction({
      title: "Reset credentials",
      description:
        "Generate a new temporary password for this administrator? Existing credentials will stop working.",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const response = await callApi({ action: "resetPassword" });
      const data = await response.json();
      setPassword(data.temporaryPassword);
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={selectedHospital}
            onChange={(event) => setSelectedHospital(event.target.value)}
          >
            {hospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={isPending || !selectedHospital}
            onClick={reassign}
          >
            Reassign
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={toggleStatus}
          >
            {status === "SUSPENDED" ? "Reactivate" : "Suspend"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={resetPassword}
          >
            Reset credentials
          </Button>
        </div>
        {password ? (
          <p className="font-mono text-xs">
            Temp password: <span className="font-semibold">{password}</span>
          </p>
        ) : null}
      </div>
    </>
  );
}
