"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

type Availability = {
  id: string;
  doctorId: string;
  hospitalId: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  until: string | null;
  updatedAt: string;
};

export function DoctorAvailabilityPanel({
  hospitalId,
  initialData,
}: {
  hospitalId: string;
  initialData: Availability[];
}) {
  const [items, setItems] = useState<Availability[]>(initialData);
  const [form, setForm] = useState({
    doctorId: "",
    status: "AVAILABLE" as "AVAILABLE" | "BUSY" | "OFFLINE",
    until: "",
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  const refresh = async () => {
    const resp = await fetch(
      `/api/receptionist/doctors/availability?hospitalId=${hospitalId}`,
    );
    const json = await resp.json();
    setItems(json.data ?? []);
  };

  const setStatus = () => {
    startTransition(async () => {
      await fetch(`/api/receptionist/doctors/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          doctorId: form.doctorId,
          status: form.status,
          until: form.until || null,
        }),
      });
      setForm({ doctorId: "", status: "AVAILABLE", until: "" });
      await refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Doctor ID"
          value={form.doctorId}
          onChange={(e) => setForm((s) => ({ ...s, doctorId: e.target.value }))}
          className="w-48"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={form.status}
          onChange={(e) =>
            setForm((s) => ({ ...s, status: e.target.value as any }))
          }
        >
          <option value="AVAILABLE">Available</option>
          <option value="BUSY">Busy</option>
          <option value="OFFLINE">Offline</option>
        </select>
        <Input
          type="datetime-local"
          placeholder="Until (optional)"
          value={form.until}
          onChange={(e) => setForm((s) => ({ ...s, until: e.target.value }))}
          className="w-56"
        />
        <Button size="sm" disabled={isPending} onClick={setStatus}>
          {isPending ? "Updating..." : "Set status"}
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">Doctor {a.doctorId}</p>
              <p className="text-xs text-muted-foreground">
                Status: {a.status} • Updated:{" "}
                {new Date(a.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No availability records.</p>
        ) : null}
      </div>
    </div>
  );
}


