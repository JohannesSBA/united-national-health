"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type HospitalDetails = {
  id: string;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  region: string | null;
};

export function HospitalDetailsForm({
  hospital,
}: {
  hospital: HospitalDetails;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState({
    contactEmail: hospital.contactEmail ?? "",
    contactPhone: hospital.contactPhone ?? "",
    description: hospital.description ?? "",
    region: hospital.region ?? "",
  });
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: "Update hospital profile",
      description:
        "Apply the updated contact information? This change is captured in the governance log.",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/hospitals/${hospital.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state }),
      });
      setIsEditing(false);
      router.refresh();
    });
  };

  if (!isEditing) {
    return (
      <>
        <ConfirmationDialog />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
        >
          Edit details
        </Button>
      </>
    );
  }

  return (
    <>
      <ConfirmationDialog />
      <form
        onSubmit={submit}
        className="mt-3 space-y-2 rounded-xl border border-border/50 p-3"
      >
        <Input
          placeholder="Region"
          value={state.region}
          onChange={(event) =>
            setState((prev) => ({ ...prev, region: event.target.value }))
          }
        />
        <Input
          placeholder="Contact email"
          type="email"
          value={state.contactEmail}
          onChange={(event) =>
            setState((prev) => ({ ...prev, contactEmail: event.target.value }))
          }
        />
        <Input
          placeholder="Contact phone"
          value={state.contactPhone}
          onChange={(event) =>
            setState((prev) => ({ ...prev, contactPhone: event.target.value }))
          }
        />
        <textarea
          className="min-h-[60px] w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          placeholder="Description"
          value={state.description}
          onChange={(event) =>
            setState((prev) => ({ ...prev, description: event.target.value }))
          }
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setState({
                contactEmail: hospital.contactEmail ?? "",
                contactPhone: hospital.contactPhone ?? "",
                description: hospital.description ?? "",
                region: hospital.region ?? "",
              });
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
