"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LogOut,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import LogoutButton from "@/app/components/auth/LogoutButton";

type HospitalAdminVerificationProps = {
  user: {
    name: string;
    email: string;
  };
};

const passwordRequirements = [
  {
    label: "At least 12 characters",
    test: (value: string) => value.length >= 12,
  },
  {
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "One number",
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    label: "One symbol (!@#$%^&*)",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export function HospitalAdminVerification({
  user,
}: HospitalAdminVerificationProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const checklistStatuses = passwordRequirements.map((requirement) =>
    requirement.test(password),
  );
  const metCount = checklistStatuses.filter(Boolean).length;
  const progressPercent = Math.round(
    (metCount / passwordRequirements.length) * 100,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!csrfToken) {
      setError(
        "Security token missing. Refresh the page or contact support if this continues.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hospital-admin/verify", {
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

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | null = null;
    async function fetchToken() {
      setIsTokenLoading(true);
      try {
        const response = await fetch("/api/hospital-admin/csrf", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch token");
        }
        const data = await response.json();
        if (active) {
          setCsrfToken(typeof data.token === "string" ? data.token : null);
        }
      } catch {
        if (active) {
          setError(
            "Unable to initialize security token. Please refresh and try again.",
          );
        }
      } finally {
        if (active) {
          setIsTokenLoading(false);
        }
      }
    }

    fetchToken();
    timer = setInterval(fetchToken, 1000 * 60 * 4);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <Card className="border border-border/70 bg-card/95 shadow-xl">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              <LogoutButton className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition hover:border-destructive/40 hover:text-destructive">
                <LogOut className="size-3.5" />
                Sign out
              </LogoutButton>
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
                disabled={isSubmitting || Boolean(successMessage) || !csrfToken}
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
              {!csrfToken && isTokenLoading ? (
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Preparing security token…
                </p>
              ) : null}
            </form>
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 text-sm shadow-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Security checklist
                </p>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Build a resilient password
                  </h2>
                  <span className="text-xs font-medium text-muted-foreground">
                    {metCount} / {passwordRequirements.length} complete
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {passwordRequirements.map((requirement, index) => {
                  const isMet = checklistStatuses[index];
                  return (
                    <li
                      key={requirement.label}
                      className={`flex items-start gap-3 rounded-2xl border p-3 text-sm transition ${
                        isMet
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                          : "border-border/60 bg-background/70 text-muted-foreground"
                      }`}
                    >
                      {isMet ? (
                        <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="mt-0.5 size-4 text-primary" />
                      )}
                      <span className="font-medium">{requirement.label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                If you did not request access, contact the national operations
                desk immediately. All attempts are logged for compliance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
