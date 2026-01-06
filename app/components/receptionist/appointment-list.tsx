"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { useCheckInDialog } from "@/app/components/receptionist/checkin-dialog";

type Appointment = {
  id: string;
  patientDisplayName: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  const [isPending, startTransition] = useTransition();
  const { confirm } = useCheckInDialog();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const checkIn = (appointmentId: string) => {
    startTransition(async () => {
      const target = appointments.find((a) => a.id === appointmentId);
      const confirmed = await confirm(target?.patientDisplayName);
      if (!confirmed) return;
      const csrf = (window as any).__csrfToken;
      await fetch("/api/receptionist/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ appointmentId }),
      });
      location.reload();
    });
  };

  const cancel = async (appointmentId: string) => {
    if (!window.confirm("Cancel this appointment?")) return;
    setCancellingId(appointmentId);
    const csrf = (window as any).__csrfToken;
    try {
      await fetch(`/api/receptionist/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        body: JSON.stringify({ action: "cancel" }),
      });
      location.reload();
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
      ) : null}
      {appointments.map((appt) => (
        <div
          key={appt.id}
          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{appt.patientDisplayName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(appt.startsAt).toLocaleString()} →{" "}
              {new Date(appt.endsAt).toLocaleTimeString()} • {appt.status}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending || appt.status !== "SCHEDULED"}
              onClick={() => checkIn(appt.id)}
            >
              Check-in
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={cancellingId === appt.id || appt.status === "CANCELLED"}
              onClick={() => cancel(appt.id)}
            >
              {cancellingId === appt.id ? "Cancelling..." : "Cancel"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
