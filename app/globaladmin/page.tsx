import LogoutButton from "../components/auth/LogoutButton";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const assignments = await db.userRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });
  const roleNames = Array.from(
    new Set(
      assignments.map((assignment) => assignment.role?.name).filter(Boolean),
    ),
  ) as string[];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Admin Console
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          Welcome, {user.name || user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as {user.email}. This page is only visible to
          Global Admins.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium text-foreground">Your Access</h2>
        {roleNames.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {roleNames.map((role) => (
              <li
                key={role}
                className="rounded-full bg-muted px-4 py-1 text-sm font-medium text-muted-foreground"
              >
                {role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No roles are assigned to your profile yet.
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Use this space to build administrative tooling (hospital onboarding,
          role assignments, reporting, etc.). For now it simply verifies that
          Global Admins can access protected routes.
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
