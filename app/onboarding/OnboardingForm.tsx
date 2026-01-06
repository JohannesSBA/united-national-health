"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export function OnboardingForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/onboarding/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json?.error || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }
      setMessage("Password updated. Redirecting...");
      window.location.href = json?.redirectTo || "/receptionist";
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold">New password</label>
        <Input name="password" type="password" minLength={12} required />
        <p className="text-xs text-muted-foreground">
          Must be 12+ chars with uppercase, lowercase, number, and symbol.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Confirm password</label>
        <Input name="confirm" type="password" minLength={12} required />
      </div>
      {message ? <div className="text-sm text-destructive">{message}</div> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save and continue"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Need help? Contact an administrator or{" "}
        <Link href="/login" className="underline">
          return to login
        </Link>
        .
      </p>
    </form>
  );
}
