"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type HospitalOption = {
  id: string;
  name: string;
};

export function AdminCreateForm({
  hospitals,
}: {
  hospitals: HospitalOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    hospitalIds: [] as string[],
  });
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const toggleHospital = (hospitalId: string) => {
    setFormState((prev) => {
      const exists = prev.hospitalIds.includes(hospitalId);
      return {
        ...prev,
        hospitalIds: exists
          ? prev.hospitalIds.filter((id) => id !== hospitalId)
          : [...prev.hospitalIds, hospitalId],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const confirmed = await confirmAction({
      title: "Create hospital admin",
      description: `Provision ${formState.name || formState.email} with elevated access?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      const response = await fetch("/api/globaladmin/hospital-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to create hospital admin");
        return;
      }
      const result = await response.json();
      setTemporaryPassword(result.temporaryPassword ?? null);
      setFormState({ name: "", email: "", hospitalIds: [] });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              name="name"
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Assign hospitals</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {hospitals.map((hospital) => (
              <label
                key={hospital.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4"
                  checked={formState.hospitalIds.includes(hospital.id)}
                  onChange={() => toggleHospital(hospital.id)}
                />
                {hospital.name}
              </label>
            ))}
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {temporaryPassword ? (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            Temporary password:{" "}
            <span className="font-mono">{temporaryPassword}</span>
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create hospital admin"}
        </Button>
      </form>
    </>
  );
}
