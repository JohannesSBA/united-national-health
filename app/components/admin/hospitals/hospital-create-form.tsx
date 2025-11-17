"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

export function HospitalCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    code: "",
    region: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
  });
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormState((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const confirmed = await confirmAction({
      title: "Confirm registration",
      description: `Register ${formState.name || "this hospital"} in the national registry? This creates an onboarding record and audit entry.`,
    });
    if (!confirmed) {
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/globaladmin/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to register hospital");
        return;
      }
      setFormState({
        name: "",
        code: "",
        region: "",
        contactEmail: "",
        contactPhone: "",
        description: "",
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="hospital-name">Hospital name</Label>
          <Input
            id="hospital-name"
            name="name"
            placeholder="e.g. Skyline Regional Medical"
            value={formState.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="hospital-code">Code</Label>
            <Input
              id="hospital-code"
              name="code"
              maxLength={8}
              placeholder="METRO"
              value={formState.code}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="hospital-region">Region</Label>
            <Input
              id="hospital-region"
              name="region"
              placeholder="Northeast"
              value={formState.region}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="hospital-email">Contact email</Label>
            <Input
              id="hospital-email"
              name="contactEmail"
              type="email"
              placeholder="governance@hospital.gov"
              value={formState.contactEmail}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="hospital-phone">Contact phone</Label>
            <Input
              id="hospital-phone"
              name="contactPhone"
              placeholder="+1-555-555-1234"
              value={formState.contactPhone}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="hospital-description">Description</Label>
          <textarea
            id="hospital-description"
            name="description"
            className="min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Add context about services and governance scope"
            value={formState.description}
            onChange={handleChange}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full md:w-auto">
          {isPending ? "Registering..." : "Register hospital"}
        </Button>
      </form>
    </>
  );
}
