"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

export function IntegrationCreateForm() {
  const router = useRouter();
  const [formState, setFormState] = useState({ name: "", description: "" });
  const [token, setToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirmAction({
      title: "Create integration key",
      description: `Issue a new API key for ${formState.name || "this integration"}?`,
    });
    if (!confirmed) return;
    startTransition(async () => {
      const response = await fetch("/api/globaladmin/system/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const data = await response.json();
      setToken(data.token ?? null);
      setFormState({ name: "", description: "" });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <form onSubmit={submit} className="space-y-2">
        <Input
          placeholder="Integration name"
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
          required
        />
        <Input
          placeholder="Description"
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Creating..." : "Create integration key"}
        </Button>
        {token ? (
          <p className="text-xs text-muted-foreground">
            Store this token securely:{" "}
            <span className="font-mono">{token}</span>
          </p>
        ) : null}
      </form>
    </>
  );
}
