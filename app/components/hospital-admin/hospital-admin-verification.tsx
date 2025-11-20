"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";

type HospitalAdminVerificationProps = {
  user: {
    name: string;
    email: string;
  };
  csrfToken: string;
};

const passwordRequirements = [
  "At least 12 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One symbol (!@#$%^&*)",
];

export function HospitalAdminVerification({
  user,
  csrfToken,
}: HospitalAdminVerificationProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hospitaladmin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(
          data?.error ??
            "Unable to update password. Please double-check the requirements.",
        );
        return;
      }

      setSuccessMessage(
        "Password updated. Redirecting you to the hospital dashboard…",
      );
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        router.replace("/hospitaladmin");
      }, 1200);
    } catch {
      setError("Unexpected error while updating password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <Card className="border border-border/70 bg-card/95 shadow-xl">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LockKeyhole className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Hospital administration
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Verify your account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {user.name || user.email}. Set a permanent password
                  to unlock your hospital dashboard.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  {successMessage}
                </div>
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || Boolean(successMessage)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving password…
                  </>
                ) : (
                  "Save password"
                )}
              </Button>
            </form>
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4 text-sm">
              <p className="font-semibold text-foreground">
                Password requirements
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {passwordRequirements.map((requirement) => (
                  <li key={requirement} className="flex items-center gap-2">
                    <AlertCircle className="size-3.5 text-primary" />
                    {requirement}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                If you did not request access, contact the national operations
                desk immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
