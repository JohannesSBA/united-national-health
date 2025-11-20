"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import axios from "axios";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authClient.signIn.email({ email, password });
      const user = await axios.get("/api/user/get").then((res) => res.data);
      await axios.post("/api/session/enforce").catch(() => undefined);
      const roles = user.roles.map(
        (role: { role: { name: string } }) => role.role.name,
      );
      if (roles.length === 1) {
        router.push(`/${roles[0].toLowerCase()}`);
      } else {
        router.push(`/dashboard`);
      }
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Unable to sign in right now.";
      const normalizedMessage = /401|unauthorized/i.test(rawMessage)
        ? "Incorrect email or password. Please try again."
        : rawMessage;
      setError(normalizedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-border/80 bg-card/95 shadow-xl">
      <CardHeader className="space-y-4 text-center pb-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            United National Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the administrative console.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!error}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={!!error}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Having trouble? Contact the system administrator for access.
        </p>
      </CardContent>
    </Card>
  );
}
