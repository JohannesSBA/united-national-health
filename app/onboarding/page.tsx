import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { auth } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.emailVerified) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/20 p-6">
      <Card className="w-full max-w-lg border-border/70 bg-card/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Finish setting up your account
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a new password to verify your email and continue to your
            workspace.
          </p>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
