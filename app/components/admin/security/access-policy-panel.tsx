"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type Policy = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  hospitalScope: string[];
};

type HospitalOption = { id: string; name: string };

export function AccessPolicyPanel({
  policies,
  hospitals,
}: {
  policies: Policy[];
  hospitals: HospitalOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    hospitalScope: hospitals.map((hospital) => hospital.id),
  });

  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const toggleHospital = (id: string) => {
    setFormState((prev) => {
      const exists = prev.hospitalScope.includes(id);
      return {
        ...prev,
        hospitalScope: exists
          ? prev.hospitalScope.filter((scope) => scope !== id)
          : [...prev.hospitalScope, id],
      };
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: "Draft access policy",
      description: `Create a draft policy named "${formState.name}"?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch("/api/globaladmin/access-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      setFormState((prev) => ({ ...prev, name: "", description: "" }));
      router.refresh();
    });
  };

  const updateStatus = async (id: string, action: "approve" | "revoke") => {
    const confirmed = await confirmAction({
      title: `${action === "approve" ? "Approve" : "Revoke"} policy`,
      description: `Are you sure you want to ${action} this cross-hospital policy?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/access-policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder="Policy name"
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
          required
        />
        <Input
          placeholder="Purpose (optional)"
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
        />
        <div className="grid gap-2 text-sm md:grid-cols-2">
          {hospitals.map((hospital) => (
            <label key={hospital.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.hospitalScope.includes(hospital.id)}
                onChange={() => toggleHospital(hospital.id)}
              />
              {hospital.name}
            </label>
          ))}
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          Draft policy
        </Button>
      </form>

      <div className="space-y-3">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="rounded-xl border border-border/60 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{policy.name}</p>
                <p className="text-muted-foreground">
                  {policy.description ?? "No description"}
                </p>
              </div>
              <span className="text-xs uppercase text-primary">
                {policy.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Scope: {policy.hospitalScope.length} hospital(s)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {policy.status !== "ACTIVE" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => updateStatus(policy.id, "approve")}
                >
                  Approve
                </Button>
              ) : null}
              {policy.status === "ACTIVE" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => updateStatus(policy.id, "revoke")}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
