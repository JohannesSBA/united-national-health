"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart4,
  CalendarClock,
  LayoutGrid,
  LogOut,
  Pill,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import LogoutButton from "@/app/components/auth/LogoutButton";

type HospitalAdminShellProps = {
  user: {
    name: string;
    email: string;
  };
  hospital: {
    id: string;
    name: string;
    status: string;
    region?: string | null;
  };
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/hospitaladmin/staff", label: "Staff", icon: Users },
  {
    href: "/hospitaladmin/departments",
    label: "Departments",
    icon: LayoutGrid,
  },
  { href: "/hospitaladmin/rooms", label: "Facilities", icon: Pill },
  { href: "/hospitaladmin/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/hospitaladmin/analytics", label: "Analytics", icon: BarChart4 },
];

export function HospitalAdminShell({
  user,
  hospital,
  children,
}: HospitalAdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="rounded-3xl border border-border/70 bg-card/95 px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                {hospital.region ?? "Hospital"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {hospital.name}
                </h1>
                <Badge
                  variant={hospital.status === "ACTIVE" ? "success" : "outline"}
                >
                  {hospital.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as {user.name || user.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="gap-2 text-xs uppercase tracking-wide"
              >
                <ShieldCheck className="size-4" />
                Activity logged
              </Button>
              <LogoutButton>
                <LogOut className="size-4" />
                Sign out
              </LogoutButton>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
