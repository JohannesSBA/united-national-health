"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

export function HospitalOnboardingForm({ hospitalId }: { hospitalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();
  const [formState, setFormState] = useState({
    action: "",
    owner: "",
    dueDate: "",
    priority: "MEDIUM",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormState((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.action || !formState.owner || !formState.dueDate) return;
    const confirmed = await confirmAction({
      title: "Add onboarding task",
      description: `Add "${formState.action}" to this hospital's onboarding list?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch("/api/globaladmin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          ...formState,
        }),
      });
      setFormState({
        action: "",
        owner: "",
        dueDate: "",
        priority: formState.priority,
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-3 text-sm">
        <div>
          <Label htmlFor={`action-${hospitalId}`}>Task name</Label>
          <Input
            id={`action-${hospitalId}`}
            name="action"
            value={formState.action}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor={`owner-${hospitalId}`}>Owner</Label>
          <Input
            id={`owner-${hospitalId}`}
            name="owner"
            value={formState.owner}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor={`due-${hospitalId}`}>Due date</Label>
            <Input
              id={`due-${hospitalId}`}
              type="date"
              name="dueDate"
              value={formState.dueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor={`priority-${hospitalId}`}>Priority</Label>
            <select
              id={`priority-${hospitalId}`}
              name="priority"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={formState.priority}
              onChange={handleChange}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding..." : "Add task"}
        </Button>
      </form>
    </>
  );
}
