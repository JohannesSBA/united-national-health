import { User } from "@/generated/prisma/client";
import {
  BarChart3,
  CalendarClock,
  Settings2,
  Stethoscope,
  UsersRound,
} from "lucide-react";

import LogoutButton from "../auth/LogoutButton";
import { Badge } from "../ui/badge";

export const receptionistNavItems = [
  {
    href: "/receptionist",
    label: "Appointments",
    description: "Today's schedule and queue",
    icon: CalendarClock,
  },
  {
    href: "/receptionist/patients",
    label: "Patients",
    description: "Profiles and visit history",
    icon: UsersRound,
  },
  {
    href: "/receptionist/reports",
    label: "Reports",
    description: "Daily metrics and handoffs",
    icon: BarChart3,
  },
  {
    href: "/receptionist/settings",
    label: "Settings",
    description: "Desk preferences",
    icon: Settings2,
  },
] as const;

export function ReceptionistHeader({ user }: { user: User }) {
  const displayName = user.name || user.email;
  const initials =
    displayName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "RC";

  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-card via-muted/70 to-card px-6 py-8 shadow-sm md:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-12 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-secondary/70 blur-3xl" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-linear-to-b from-transparent via-border/60 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold tracking-tight text-primary shadow-inner ring-1 ring-primary/10">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 ring-1 ring-primary/15">
                  Reception Desk
                </span>
                <Badge variant="success">On duty</Badge>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep arrivals flowing smoothly. Jump into today&apos;s schedule,
                doctor coordination, or quick reports from here.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/40">
              Live desk ready
            </span>
            <LogoutButton className="rounded-full bg-card/80 px-4 py-2 text-sm font-semibold shadow-xs transition hover:-translate-y-0.5 hover:shadow-md" />
          </div>
        </div>
      </div>
    </header>
  );
}
