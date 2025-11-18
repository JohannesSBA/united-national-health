import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { label: "Dashboard", href: "/globaladmin", key: "dashboard" },
  { label: "Hospitals", href: "/globaladmin/hospitals", key: "hospitals" },
  {
    label: "Administrators",
    href: "/globaladmin/administrators",
    key: "administrators",
  },
  {
    label: "System Monitoring",
    href: "/globaladmin/system-monitoring",
    key: "system",
  },
  {
    label: "Security & Compliance",
    href: "/globaladmin/security",
    key: "security",
  },
  { label: "Settings", href: "/globaladmin/settings", key: "settings" },
];

type AdminNavProps = {
  activeKey?: string;
};

export function AdminNav({ activeKey = "dashboard" }: AdminNavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/90 p-3 text-sm shadow-sm">
      {links.map((link) => {
        const isActive = link.key === activeKey;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-xl px-4 py-2 font-medium transition hover:bg-primary/10",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
