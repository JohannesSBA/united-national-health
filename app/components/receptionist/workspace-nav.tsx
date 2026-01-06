import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function WorkspaceNav({
  title = "Navigate the desk",
  subtitle = "Separate flows for appointments, doctors, patients, reports, and settings.",
  badge,
  items,
}: {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  items: Item[];
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workspace pages
          </p>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {badge ? (
          <div className="rounded-full border border-border/70 px-4 py-1 text-xs font-semibold">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {items.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "group h-full justify-start rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card",
            )}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="ml-3 space-y-1">
              <div className="text-base font-semibold leading-tight">
                {label}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowUpRight className="ml-auto size-4 text-muted-foreground transition group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </section>
  );
}
