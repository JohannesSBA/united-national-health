"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type MfaPolicy = {
  required: boolean;
  enforcedFor: string[];
};

export function MfaPolicyForm({ policy }: { policy: MfaPolicy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(policy);
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const toggleRole = (role: string) => {
    setState((prev) => {
      const include = prev.enforcedFor.includes(role);
      return {
        ...prev,
        enforcedFor: include
          ? prev.enforcedFor.filter((value) => value !== role)
          : [...prev.enforcedFor, role],
      };
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: "Update MFA policy",
      description:
        "Apply the new multi-factor authentication requirement across administrative roles?",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch("/api/globaladmin/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mfa_policy", value: state }),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.required}
            onChange={(event) =>
              setState((prev) => ({ ...prev, required: event.target.checked }))
            }
          />
          Require MFA for administrative roles
        </label>
        <div className="space-y-2">
          {["GLOBAL_ADMIN", "HOSPITAL_ADMIN"].map((role) => (
            <label key={role} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.enforcedFor.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Updating..." : "Update MFA policy"}
        </Button>
      </form>
    </>
  );
}
