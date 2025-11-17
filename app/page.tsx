import { ArrowRight, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";

const pillars = [
  {
    title: "Streamlined Operations",
    description:
      "Centralize approvals, onboarding, and internal audits so hospital leadership has a single place to coordinate decisions.",
  },
  {
    title: "Role-Based Oversight",
    description:
      "Assign precise permissions for administrative teams, regional directors, and compliance staff without exposing clinical records.",
  },
  {
    title: "Insightful Reporting",
    description:
      "Review facility readiness, staffing coverage, and escalation history with dashboards designed for executive visibility.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">
          United National Health
        </h1>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
        >
          Access Console
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16 lg:py-24">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
              <ShieldCheck className="size-3.5" />
              National administrative platform
            </span>
            <div className="space-y-4">
              <h2 className="text-4xl font-semibold tracking-tight text-balance">
                Coordinate every hospital workflow from a single command center.
              </h2>
              <p className="text-lg text-muted-foreground">
                United National Health brings credentialing, facility
                onboarding, capacity reviews, and policy enforcement together
                for trusted administrators. Keep teams aligned, document key
                decisions, and activate rapid responses without touching
                patient-facing systems.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-md transition hover:bg-primary/90"
              >
                Sign in to Admin Console
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/40"
              >
                View operating playbook
                <Workflow className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{pillar.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {pillar.description}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
