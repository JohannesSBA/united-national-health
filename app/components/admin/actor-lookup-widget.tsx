"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

type LookupResult = {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  hospitals: string[];
  createdAt: string;
  updatedAt: string;
};

export function ActorLookupWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [actorId, setActorId] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lookup = () => {
    setError(null);
    setResult(null);
    if (!actorId.trim()) {
      setError("Enter an actor (user) ID.");
      return;
    }
    startTransition(async () => {
      const response = await fetch(`/api/globaladmin/actors/${actorId.trim()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Lookup failed");
        return;
      }
      const data = await response.json();
      setResult(data.data);
    });
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-80 rounded-2xl border border-border/70 bg-card shadow-lg"
      role="complementary"
      aria-label="Actor lookup"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-2xl border-b border-border/60 px-4 py-2 text-sm font-semibold"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Actor Lookup
        <span>{isOpen ? "–" : "+"}</span>
      </button>
      {isOpen ? (
        <div className="space-y-3 p-4 text-sm">
          <Input
            placeholder="User ID"
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            className="h-9"
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={lookup}
            disabled={isPending}
          >
            {isPending ? "Searching..." : "Lookup"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result && (
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
              <p className="font-semibold">{result.name}</p>
              <p>{result.email}</p>
              <p>Status: {result.status}</p>
              <p>Roles: {result.roles.join(", ") || "—"}</p>
              <p>Hospitals: {result.hospitals.join(", ") || "—"}</p>
              <p className="text-muted-foreground">
                Updated {new Date(result.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
