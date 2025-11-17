"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { IntegrationStatusValue } from "@/lib/types/admin";
import { useActionConfirmation } from "@/app/components/admin/action-confirmation";

type Integration = {
  id: string;
  name: string;
  description: string | null;
  status: IntegrationStatusValue;
  lastFour: string | null;
};

export function IntegrationList({
  integrations,
}: {
  integrations: Integration[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmAction, ConfirmationDialog } = useActionConfirmation();

  const mutate = async (id: string, body: unknown, message: string) => {
    const confirmed = await confirmAction({
      title: "Confirm integration change",
      description: message,
    });
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/globaladmin/system/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-border/60 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{integration.name}</p>
                <p className="text-muted-foreground">
                  {integration.description ?? "No description"}
                </p>
              </div>
              <span className="text-xs uppercase text-primary">
                {integration.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Token ending in {integration.lastFour ?? "????"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  mutate(
                    integration.id,
                    { action: "rotate" },
                    `Rotate API key for ${integration.name}? Existing tokens will be revoked.`,
                  )
                }
              >
                Rotate key
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  mutate(
                    integration.id,
                    {
                      action: "status",
                      status:
                        integration.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                    },
                    `${integration.status === "ACTIVE" ? "Disable" : "Activate"} ${integration.name}?`,
                  )
                }
              >
                {integration.status === "ACTIVE" ? "Disable" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
